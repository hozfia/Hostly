package storage

import (
	"context"
	"fmt"
)

var schemaStatements = []string{
	`
	CREATE TABLE IF NOT EXISTS app_settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)
	`,
	`
	CREATE TABLE IF NOT EXISTS host_groups (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		is_active INTEGER NOT NULL DEFAULT 1,
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)
	`,
	`
	CREATE TABLE IF NOT EXISTS host_group_entries (
		id TEXT PRIMARY KEY,
		group_id TEXT NOT NULL,
		entry_id TEXT NOT NULL DEFAULT '',
		line INTEGER NOT NULL DEFAULT 0,
		name TEXT NOT NULL,
		ip TEXT NOT NULL DEFAULT '',
		hostnames_json TEXT NOT NULL DEFAULT '[]',
		comment TEXT NOT NULL DEFAULT '',
		is_active INTEGER NOT NULL DEFAULT 1,
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		FOREIGN KEY (group_id) REFERENCES host_groups(id) ON DELETE CASCADE
	)
	`,
	`
	CREATE INDEX IF NOT EXISTS idx_host_group_entries_group_id_sort_order
		ON host_group_entries(group_id, sort_order)
	`,
}

func (s *Store) runMigrations(ctx context.Context) error {
	ctx = contextOrBackground(ctx)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin storage migration transaction: %w", err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	for _, statement := range schemaStatements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("run storage migration: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit storage migration transaction: %w", err)
	}

	return nil
}
