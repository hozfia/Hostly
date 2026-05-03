package hosts

import (
	"fmt"
	"os"
	"strings"
)

// ApplyEntryStates updates targeted hosts entries to active/inactive while preserving other lines.
func ApplyEntryStates(content string, entryStates map[int]bool) (string, error) {
	if len(entryStates) == 0 {
		return content, nil
	}

	parsed, err := ParseHosts(content)
	if err != nil {
		return "", err
	}

	lineEnding := "\n"
	if strings.Contains(content, "\r\n") {
		lineEnding = "\r\n"
	}

	normalizedContent := strings.ReplaceAll(content, "\r\n", "\n")
	lines := strings.Split(normalizedContent, "\n")
	entriesByLine := make(map[int]HostEntry, len(parsed.Entries))

	for _, entry := range parsed.Entries {
		entriesByLine[entry.Line] = entry
	}

	for lineNumber, isActive := range entryStates {
		entry, ok := entriesByLine[lineNumber]
		if !ok {
			continue
		}

		entry.Disabled = !isActive
		if lineNumber-1 >= 0 && lineNumber-1 < len(lines) {
			lines[lineNumber-1] = formatHostEntry(entry)
		}
	}

	return strings.Join(lines, lineEnding), nil
}

// ApplyEntryStatesToFile updates targeted hosts entries on disk.
func ApplyEntryStatesToFile(path string, entryStates map[int]bool) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read hosts file: %w", err)
	}

	updatedContent, err := ApplyEntryStates(string(content), entryStates)
	if err != nil {
		return err
	}

	fileMode := os.FileMode(0o644)
	fileInfo, err := os.Stat(path)
	if err == nil {
		fileMode = fileInfo.Mode().Perm()
	}

	if err := os.WriteFile(path, []byte(updatedContent), fileMode); err != nil {
		return fmt.Errorf("write hosts file: %w", err)
	}

	return nil
}

// ApplyPlan updates targeted hosts entries based on a generated plan.
func ApplyPlan(content string, plan Plan) (string, error) {
	entryStates := make(map[int]bool, len(plan.Activate)+len(plan.Deactivate))

	for _, line := range plan.Activate {
		entryStates[line] = true
	}

	for _, line := range plan.Deactivate {
		entryStates[line] = false
	}

	result, err := ApplyEntryStates(content, entryStates)
	if err != nil {
		return "", err
	}

	if len(plan.UpdateEntries) > 0 {
		result, err = applyLineUpdates(result, plan.UpdateEntries)
		if err != nil {
			return "", err
		}
	}

	for _, entry := range plan.AppendEntries {
		if len(result) > 0 && result[len(result)-1] != '\n' {
			result += "\n"
		}
		result += formatHostEntry(entry) + "\n"
	}

	return result, nil
}

func applyLineUpdates(content string, updates []UpdateEntry) (string, error) {
	lineEnding := "\n"
	if strings.Contains(content, "\r\n") {
		lineEnding = "\r\n"
	}

	normalizedContent := strings.ReplaceAll(content, "\r\n", "\n")
	lines := strings.Split(normalizedContent, "\n")

	for _, update := range updates {
		lineIndex := update.Line - 1
		if lineIndex < 0 || lineIndex >= len(lines) {
			continue
		}
		lines[lineIndex] = formatHostEntry(update.Entry)
	}

	return strings.Join(lines, lineEnding), nil
}

// ApplyPlanToFile applies a generated plan directly to a hosts file on disk.
func ApplyPlanToFile(path string, plan Plan) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read hosts file: %w", err)
	}

	updatedContent, err := ApplyPlan(string(content), plan)
	if err != nil {
		return err
	}

	fileMode := os.FileMode(0o644)
	if fileInfo, statErr := os.Stat(path); statErr == nil {
		fileMode = fileInfo.Mode().Perm()
	}

	if err := os.WriteFile(path, []byte(updatedContent), fileMode); err != nil {
		return fmt.Errorf("write hosts file: %w", err)
	}

	return nil
}

func formatHostEntry(entry HostEntry) string {
	base := fmt.Sprintf("%s %s", entry.IP, strings.Join(entry.Hostnames, " "))
	if entry.Comment != "" {
		base = fmt.Sprintf("%s # %s", base, entry.Comment)
	}
	if entry.Disabled {
		return "# " + base
	}
	return base
}
