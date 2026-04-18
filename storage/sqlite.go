package storage

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

const defaultDatabaseFileName = "hostly.db"

// Store owns the SQLite connection and repository methods for app state.
type Store struct {
	db   *sql.DB
	path string
}

// OpenDefault opens the app's default SQLite database path and runs migrations.
func OpenDefault() (*Store, error) {
	path, err := DefaultPath()
	if err != nil {
		return nil, err
	}

	return Open(path)
}

// Open opens a SQLite database at the provided path and runs migrations.
func Open(path string) (*Store, error) {
	cleanPath := filepath.Clean(strings.TrimSpace(path))
	if cleanPath == "" || cleanPath == "." {
		return nil, fmt.Errorf("storage database path is required")
	}

	if err := os.MkdirAll(filepath.Dir(cleanPath), 0o755); err != nil {
		return nil, fmt.Errorf("create storage directory: %w", err)
	}

	db, err := sql.Open("sqlite", cleanPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}

	store := &Store{
		db:   db,
		path: cleanPath,
	}

	if err := store.initialize(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

// DefaultPath resolves the default on-disk location for the app database.
func DefaultPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		homeDir, homeErr := os.UserHomeDir()
		if homeErr != nil {
			return "", fmt.Errorf("resolve config directory: %w", err)
		}

		configDir = filepath.Join(homeDir, ".config")
	}

	return filepath.Join(configDir, "hostly", "storage", defaultDatabaseFileName), nil
}

// Path returns the database path used by the store.
func (s *Store) Path() string {
	if s == nil {
		return ""
	}

	return s.path
}

// Close closes the underlying SQLite database connection.
func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}

	return s.db.Close()
}

func (s *Store) initialize(ctx context.Context) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("storage database is not initialized")
	}

	ctx = contextOrBackground(ctx)

	if err := s.db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping sqlite database: %w", err)
	}

	for _, pragma := range []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA busy_timeout = 5000",
		"PRAGMA journal_mode = WAL",
	} {
		if _, err := s.db.ExecContext(ctx, pragma); err != nil {
			return fmt.Errorf("configure sqlite database: %w", err)
		}
	}

	if err := s.runMigrations(ctx); err != nil {
		return err
	}

	return nil
}

func contextOrBackground(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}

	return ctx
}
