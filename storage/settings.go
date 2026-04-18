package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const SettingLastHostsFile = "last_hosts_file"

var ErrSettingNotFound = errors.New("setting not found")

// SetSetting upserts a string setting in the SQLite store.
func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("storage database is not initialized")
	}

	trimmedKey := strings.TrimSpace(key)
	if trimmedKey == "" {
		return fmt.Errorf("setting key is required")
	}

	_, err := s.db.ExecContext(
		contextOrBackground(ctx),
		`
		INSERT INTO app_settings (key, value, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
		`,
		trimmedKey,
		value,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil {
		return fmt.Errorf("save setting %q: %w", trimmedKey, err)
	}

	return nil
}

// GetSetting returns a previously stored string setting.
func (s *Store) GetSetting(ctx context.Context, key string) (string, error) {
	if s == nil || s.db == nil {
		return "", fmt.Errorf("storage database is not initialized")
	}

	trimmedKey := strings.TrimSpace(key)
	if trimmedKey == "" {
		return "", fmt.Errorf("setting key is required")
	}

	var value string
	err := s.db.QueryRowContext(
		contextOrBackground(ctx),
		`SELECT value FROM app_settings WHERE key = ?`,
		trimmedKey,
	).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrSettingNotFound
	}
	if err != nil {
		return "", fmt.Errorf("load setting %q: %w", trimmedKey, err)
	}

	return value, nil
}

// SaveLastHostsFile stores the last hosts file path the app worked with.
func (s *Store) SaveLastHostsFile(ctx context.Context, path string) error {
	return s.SetSetting(ctx, SettingLastHostsFile, strings.TrimSpace(path))
}

// LastHostsFile returns the last saved hosts file path.
func (s *Store) LastHostsFile(ctx context.Context) (string, error) {
	return s.GetSetting(ctx, SettingLastHostsFile)
}
