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

type HostsPlanPreview struct {
	Plan   hosts.Plan          `json:"plan"`
	Review hosts.ReviewSummary `json:"review"`
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

func (a *App) PreviewHostsSelection(path string, items []SaveHostsSelectionItem) (HostsPlanPreview, error) {
	if strings.TrimSpace(path) == "" {
		return HostsPlanPreview{}, fmt.Errorf("no hosts file path available for planning")
	}

	parsed, err := hosts.ParseHostsFile(path)
	if err != nil {
		return HostsPlanPreview{}, fmt.Errorf("parse hosts file for planning: %w", err)
	}

	requests := buildRequestedStateChanges(parsed, items)
	plan, review := hosts.BuildPlan(requests, parsed)

	return HostsPlanPreview{
		Plan:   plan,
		Review: review,
	}, nil
}

func (a *App) ApplyHostsPlan(path string, plan hosts.Plan) (ParsedHostsSelection, error) {
	if strings.TrimSpace(path) == "" {
		return ParsedHostsSelection{}, fmt.Errorf("no hosts file path available for saving")
	}

	if err := hosts.ApplyPlanToFile(path, plan); err != nil {
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

func (a *App) SaveHostsSelection(path string, items []SaveHostsSelectionItem) (ParsedHostsSelection, error) {
	preview, err := a.PreviewHostsSelection(path, items)
	if err != nil {
		return ParsedHostsSelection{}, err
	}

	return a.ApplyHostsPlan(path, preview.Plan)
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

func buildRequestedStateChanges(parsed hosts.HostsFile, items []SaveHostsSelectionItem) []hosts.RequestedStateChange {
	entriesByLine := make(map[int]hosts.HostEntry, len(parsed.Entries))
	for _, entry := range parsed.Entries {
		entriesByLine[entry.Line] = entry
	}

	requests := make([]hosts.RequestedStateChange, 0)

	appendRequest := func(line int, desiredActive bool, fallback hosts.HostEntry) {
		target, ok := entriesByLine[line]
		if !ok {
			target = fallback
		}
		if target.Line == 0 {
			target.Line = line
		}

		requests = append(requests, hosts.RequestedStateChange{
			Target:   target,
			Activate: desiredActive,
		})
	}

	for _, item := range items {
		if len(item.Children) > 0 {
			for _, child := range item.Children {
				desiredActive := child.IsActive
				if item.HasPendingStateChange {
					desiredActive = item.IsActive
				}

				appendRequest(
					child.Line,
					desiredActive,
					hosts.HostEntry{
						Line:      child.Line,
						IP:        child.IP,
						Hostnames: append([]string(nil), child.Hostnames...),
						Comment:   child.Comment,
						Disabled:  !desiredActive,
					},
				)
			}
			continue
		}

		appendRequest(
			item.Line,
			item.IsActive,
			hosts.HostEntry{
				Line:      item.Line,
				IP:        item.IP,
				Hostnames: append([]string(nil), item.Hostnames...),
				Comment:   item.Comment,
				Disabled:  !item.IsActive,
			},
		)
	}

	return requests
}
