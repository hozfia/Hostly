package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ListGroups loads all saved groups and their entries from SQLite.
func (s *Store) ListGroups(ctx context.Context) ([]Group, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("storage database is not initialized")
	}

	ctx = contextOrBackground(ctx)

	groupRows, err := s.db.QueryContext(
		ctx,
		`
		SELECT id, name, is_active, sort_order
		FROM host_groups
		ORDER BY sort_order, name
		`,
	)
	if err != nil {
		return nil, fmt.Errorf("list groups: %w", err)
	}
	defer groupRows.Close()

	groups := make([]Group, 0)
	groupIndexByID := make(map[string]int)

	for groupRows.Next() {
		var (
			group     Group
			isActive  int
			sortOrder int
		)

		if err := groupRows.Scan(&group.ID, &group.Name, &isActive, &sortOrder); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}

		group.IsActive = isActive == 1
		group.SortOrder = sortOrder
		group.Children = []GroupEntry{}

		groupIndexByID[group.ID] = len(groups)
		groups = append(groups, group)
	}

	if err := groupRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate groups: %w", err)
	}

	entryRows, err := s.db.QueryContext(
		ctx,
		`
		SELECT id, group_id, entry_id, line, name, ip, hostnames_json, comment, is_active, sort_order
		FROM host_group_entries
		ORDER BY group_id, sort_order, name
		`,
	)
	if err != nil {
		return nil, fmt.Errorf("list group entries: %w", err)
	}
	defer entryRows.Close()

	for entryRows.Next() {
		var (
			entry         GroupEntry
			groupID       string
			hostnamesJSON string
			isActive      int
			sortOrder     int
		)

		if err := entryRows.Scan(
			&entry.ID,
			&groupID,
			&entry.EntryID,
			&entry.Line,
			&entry.Name,
			&entry.IP,
			&hostnamesJSON,
			&entry.Comment,
			&isActive,
			&sortOrder,
		); err != nil {
			return nil, fmt.Errorf("scan group entry: %w", err)
		}

		if hostnamesJSON != "" {
			if err := json.Unmarshal([]byte(hostnamesJSON), &entry.Hostnames); err != nil {
				return nil, fmt.Errorf("decode hostnames for entry %q: %w", entry.ID, err)
			}
		}

		entry.IsActive = isActive == 1
		entry.SortOrder = sortOrder

		groupIndex, ok := groupIndexByID[groupID]
		if !ok {
			continue
		}

		groups[groupIndex].Children = append(groups[groupIndex].Children, entry)
	}

	if err := entryRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate group entries: %w", err)
	}

	return groups, nil
}

// ReplaceGroups replaces the stored group tree with the provided collection.
func (s *Store) ReplaceGroups(ctx context.Context, groups []Group) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("storage database is not initialized")
	}

	ctx = contextOrBackground(ctx)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin replace groups transaction: %w", err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, `DELETE FROM host_group_entries`); err != nil {
		return fmt.Errorf("clear group entries: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM host_groups`); err != nil {
		return fmt.Errorf("clear groups: %w", err)
	}

	now := time.Now().UTC().Format(time.RFC3339Nano)

	for groupIndex, group := range groups {
		groupID := strings.TrimSpace(group.ID)
		groupName := strings.TrimSpace(group.Name)
		if groupID == "" {
			return fmt.Errorf("group at index %d is missing an id", groupIndex)
		}
		if groupName == "" {
			return fmt.Errorf("group %q is missing a name", groupID)
		}

		if _, err := tx.ExecContext(
			ctx,
			`
			INSERT INTO host_groups (id, name, is_active, sort_order, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			`,
			groupID,
			groupName,
			boolToInt(group.IsActive),
			groupIndex,
			now,
			now,
		); err != nil {
			return fmt.Errorf("insert group %q: %w", groupID, err)
		}

		for childIndex, child := range group.Children {
			childID := strings.TrimSpace(child.ID)
			if childID == "" {
				childID = fmt.Sprintf("%s-child-%d", groupID, childIndex)
			}

			hostnamesJSON, err := json.Marshal(child.Hostnames)
			if err != nil {
				return fmt.Errorf("encode hostnames for child %q: %w", childID, err)
			}

			if _, err := tx.ExecContext(
				ctx,
				`
				INSERT INTO host_group_entries (
					id, group_id, entry_id, line, name, ip, hostnames_json, comment,
					is_active, sort_order, created_at, updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				childID,
				groupID,
				strings.TrimSpace(child.EntryID),
				child.Line,
				strings.TrimSpace(child.Name),
				strings.TrimSpace(child.IP),
				string(hostnamesJSON),
				strings.TrimSpace(child.Comment),
				boolToInt(child.IsActive),
				childIndex,
				now,
				now,
			); err != nil {
				return fmt.Errorf("insert group entry %q: %w", childID, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit replace groups transaction: %w", err)
	}

	return nil
}

// DeleteGroup removes a saved group and its child entries.
func (s *Store) DeleteGroup(ctx context.Context, groupID string) error {
	if s == nil || s.db == nil {
		return fmt.Errorf("storage database is not initialized")
	}

	trimmedGroupID := strings.TrimSpace(groupID)
	if trimmedGroupID == "" {
		return fmt.Errorf("group id is required")
	}

	_, err := s.db.ExecContext(
		contextOrBackground(ctx),
		`DELETE FROM host_groups WHERE id = ?`,
		trimmedGroupID,
	)
	if err != nil {
		return fmt.Errorf("delete group %q: %w", trimmedGroupID, err)
	}

	return nil
}

func boolToInt(value bool) int {
	if value {
		return 1
	}

	return 0
}
