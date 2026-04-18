package hosts

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"strings"
)

// HostsFile is the JSON-friendly representation of a hosts file.
type HostsFile struct {
	Entries []HostEntry `json:"entries"`
}

// HostEntry represents a single hosts mapping line.
type HostEntry struct {
	Line      int      `json:"line"`
	Raw       string   `json:"raw"`
	IP        string   `json:"ip"`
	Hostnames []string `json:"hostnames"`
	Comment   string   `json:"comment,omitempty"`
	Disabled  bool     `json:"disabled"`
}

// ParseHosts converts raw hosts file content into a structured representation.
func ParseHosts(content string) (HostsFile, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	result := HostsFile{Entries: []HostEntry{}}

	lineNumber := 0
	for scanner.Scan() {
		lineNumber++

		entry, ok, err := parseHostsLine(scanner.Text(), lineNumber)
		if err != nil {
			return HostsFile{}, err
		}
		if ok {
			result.Entries = append(result.Entries, entry)
		}
	}

	if err := scanner.Err(); err != nil {
		return HostsFile{}, fmt.Errorf("scan hosts content: %w", err)
	}

	return result, nil
}

// ParseHostsToJSON converts raw hosts file content directly into JSON.
func ParseHostsToJSON(content string) (string, error) {
	parsed, err := ParseHosts(content)
	if err != nil {
		return "", err
	}

	data, err := json.MarshalIndent(parsed, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal hosts json: %w", err)
	}

	return string(data), nil
}

// ParseHostsFile reads a hosts file from disk and parses it.
func ParseHostsFile(path string) (HostsFile, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return HostsFile{}, fmt.Errorf("read hosts file: %w", err)
	}

	return ParseHosts(string(content))
}

// ParseHostsFileToJSON reads a hosts file from disk and returns its JSON representation.
func ParseHostsFileToJSON(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read hosts file: %w", err)
	}

	return ParseHostsToJSON(string(content))
}

func parseHostsLine(rawLine string, lineNumber int) (HostEntry, bool, error) {
	trimmed := strings.TrimSpace(rawLine)
	if trimmed == "" {
		return HostEntry{}, false, nil
	}

	disabled := false
	lineToParse := trimmed

	if strings.HasPrefix(lineToParse, "#") {
		disabled = true
		lineToParse = strings.TrimSpace(strings.TrimPrefix(lineToParse, "#"))
		if lineToParse == "" {
			return HostEntry{}, false, nil
		}
	}

	comment := ""
	if index := strings.Index(lineToParse, "#"); index >= 0 {
		comment = strings.TrimSpace(lineToParse[index+1:])
		lineToParse = strings.TrimSpace(lineToParse[:index])
	}

	if lineToParse == "" {
		return HostEntry{}, false, nil
	}

	fields := strings.Fields(lineToParse)
	if len(fields) < 2 {
		if disabled {
			return HostEntry{}, false, nil
		}

		return HostEntry{}, false, fmt.Errorf("invalid hosts entry on line %d: %q", lineNumber, rawLine)
	}

	ipAddress := fields[0]
	if net.ParseIP(ipAddress) == nil {
		if disabled {
			return HostEntry{}, false, nil
		}

		return HostEntry{}, false, fmt.Errorf("invalid IP address on line %d: %q", lineNumber, ipAddress)
	}

	return HostEntry{
		Line:      lineNumber,
		Raw:       rawLine,
		IP:        ipAddress,
		Hostnames: fields[1:],
		Comment:   comment,
		Disabled:  disabled,
	}, true, nil
}
