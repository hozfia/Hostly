package main

import (
	"context"
	"fmt"
	"path/filepath"
	goruntime "runtime"

	"hostly/hosts"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

type ParsedHostsSelection struct {
	Path      string            `json:"path"`
	FileName  string            `json:"fileName"`
	Entries   []hosts.HostEntry `json:"entries"`
	Cancelled bool              `json:"cancelled"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) SelectHostsFile() (ParsedHostsSelection, error) {
	selectedPath, err := wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title:            "Select a hosts file",
		DefaultDirectory: defaultHostsDirectory(),
		Filters: []wailsruntime.FileFilter{
			{
				DisplayName: "Hosts files",
				Pattern:     "hosts;*.txt;*.conf",
			},
		},
	})
	if err != nil {
		return ParsedHostsSelection{}, fmt.Errorf("open hosts file dialog: %w", err)
	}

	if selectedPath == "" {
		return ParsedHostsSelection{
			Entries:   []hosts.HostEntry{},
			Cancelled: true,
		}, nil
	}

	parsed, err := hosts.ParseHostsFile(selectedPath)
	if err != nil {
		return ParsedHostsSelection{}, fmt.Errorf("parse hosts file: %w", err)
	}

	return ParsedHostsSelection{
		Path:      selectedPath,
		FileName:  filepath.Base(selectedPath),
		Entries:   parsed.Entries,
		Cancelled: false,
	}, nil
}

func defaultHostsDirectory() string {
	switch goruntime.GOOS {
	case "windows":
		return `C:\Windows\System32\drivers\etc`
	default:
		return "/etc"
	}
}
