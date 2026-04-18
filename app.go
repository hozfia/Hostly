package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"

	"hostly/hosts"
	"hostly/storage"
)

// App struct
type App struct {
	ctx              context.Context
	store            *storage.Store
	storageInitError error
}

type ParsedHostsSelection struct {
	Path      string            `json:"path"`
	FileName  string            `json:"fileName"`
	Entries   []hosts.HostEntry `json:"entries"`
	Cancelled bool              `json:"cancelled"`
}

type SaveHostsSelectionEntry struct {
	ID        string   `json:"id"`
	EntryID   string   `json:"entryId"`
	Line      int      `json:"line"`
	Name      string   `json:"name"`
	IP        string   `json:"ip"`
	Hostnames []string `json:"hostnames"`
	Comment   string   `json:"comment,omitempty"`
	IsActive  bool     `json:"isActive"`
}

type SaveHostsSelectionItem struct {
	ID                    string                    `json:"id"`
	EntryID               string                    `json:"entryId,omitempty"`
	Line                  int                       `json:"line,omitempty"`
	Name                  string                    `json:"name"`
	IP                    string                    `json:"ip,omitempty"`
	Hostnames             []string                  `json:"hostnames,omitempty"`
	Comment               string                    `json:"comment,omitempty"`
	IsActive              bool                      `json:"isActive"`
	HasPendingStateChange bool                      `json:"hasPendingStateChange"`
	Children              []SaveHostsSelectionEntry `json:"children,omitempty"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	store, err := storage.OpenDefault()
	if err != nil {
		a.storageInitError = err
		fmt.Printf("storage init failed: %v\n", err)
		return
	}

	a.store = store
}

func (a *App) shutdown(ctx context.Context) {
	if a.store == nil {
		return
	}

	if err := a.store.Close(); err != nil {
		fmt.Printf("storage shutdown failed: %v\n", err)
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) LoadStoredGroups() ([]storage.Group, error) {
	store, err := a.requireStore()
	if err != nil {
		return nil, err
	}

	return store.ListGroups(a.ctx)
}

func (a *App) SaveStoredGroups(groups []storage.Group) error {
	store, err := a.requireStore()
	if err != nil {
		return err
	}

	return store.ReplaceGroups(a.ctx, groups)
}

func (a *App) DeleteStoredGroup(groupID string) error {
	store, err := a.requireStore()
	if err != nil {
		return err
	}

	return store.DeleteGroup(a.ctx, groupID)
}

func (a *App) LastStoredHostsFile() (string, error) {
	store, err := a.requireStore()
	if err != nil {
		return "", err
	}

	return store.LastHostsFile(a.ctx)
}

func (a *App) SelectHostsFile() (ParsedHostsSelection, error) {
	selectedPath := defaultHostsFilePath()
	if strings.TrimSpace(selectedPath) == "" {
		return ParsedHostsSelection{}, fmt.Errorf("could not resolve the default hosts file path")
	}

	parsed, err := hosts.ParseHostsFile(selectedPath)
	if err != nil {
		return ParsedHostsSelection{}, fmt.Errorf("open default hosts file: %w", err)
	}

	if a.store != nil {
		if err := a.store.SaveLastHostsFile(a.ctx, selectedPath); err != nil {
			fmt.Printf("save last hosts file: %v\n", err)
		}
	}

	return ParsedHostsSelection{
		Path:      selectedPath,
		FileName:  filepath.Base(selectedPath),
		Entries:   parsed.Entries,
		Cancelled: false,
	}, nil
}

func (a *App) SaveHostsSelection(path string, items []SaveHostsSelectionItem) (ParsedHostsSelection, error) {
	if strings.TrimSpace(path) == "" {
		return ParsedHostsSelection{}, fmt.Errorf("no hosts file path available for saving")
	}

	entryStates := make(map[int]bool)
	for _, item := range items {
		if len(item.Children) > 0 {
			for _, child := range item.Children {
				if child.Line <= 0 {
					continue
				}

				isActive := child.IsActive
				if item.HasPendingStateChange {
					isActive = item.IsActive
				}

				entryStates[child.Line] = isActive
			}
			continue
		}

		if item.Line > 0 {
			entryStates[item.Line] = item.IsActive
		}
	}

	if err := hosts.ApplyEntryStatesToFile(path, entryStates); err != nil {
		return ParsedHostsSelection{}, err
	}

	parsed, err := hosts.ParseHostsFile(path)
	if err != nil {
		return ParsedHostsSelection{}, fmt.Errorf("parse saved hosts file: %w", err)
	}

	if a.store != nil {
		if err := a.store.SaveLastHostsFile(a.ctx, path); err != nil {
			fmt.Printf("save last hosts file: %v\n", err)
		}
	}

	return ParsedHostsSelection{
		Path:      path,
		FileName:  filepath.Base(path),
		Entries:   parsed.Entries,
		Cancelled: false,
	}, nil
}

func defaultHostsFilePath() string {
	switch goruntime.GOOS {
	case "windows":
		return firstExistingPath(`C:\Windows\System32\drivers\etc\hosts`)
	case "darwin":
		return firstExistingPath("/private/etc/hosts", "/etc/hosts")
	default:
		return firstExistingPath("/etc/hosts")
	}
}

func firstExistingPath(paths ...string) string {
	for _, path := range paths {
		_, err := os.Stat(path)
		if err == nil {
			return path
		}
	}

	return ""
}

func (a *App) requireStore() (*storage.Store, error) {
	if a.store != nil {
		return a.store, nil
	}

	if a.storageInitError != nil {
		return nil, fmt.Errorf("storage is unavailable: %w", a.storageInitError)
	}

	return nil, fmt.Errorf("storage is not initialized")
}
