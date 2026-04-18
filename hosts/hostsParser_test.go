package hosts

import (
	"strings"
	"testing"
)

func TestParseHosts(t *testing.T) {
	content := strings.Join([]string{
		"# regular comment",
		"127.0.0.1 localhost local.dev # loopback",
		"# 10.0.0.5 api.local admin.local # disabled entry",
		"::1 localhost",
	}, "\n")

	parsed, err := ParseHosts(content)
	if err != nil {
		t.Fatalf("ParseHosts returned an error: %v", err)
	}

	if len(parsed.Entries) != 3 {
		t.Fatalf("expected 3 parsed entries, got %d", len(parsed.Entries))
	}

	first := parsed.Entries[0]
	if first.IP != "127.0.0.1" {
		t.Fatalf("expected first IP to be 127.0.0.1, got %q", first.IP)
	}
	if len(first.Hostnames) != 2 || first.Hostnames[0] != "localhost" || first.Hostnames[1] != "local.dev" {
		t.Fatalf("unexpected first hostnames: %#v", first.Hostnames)
	}
	if first.Comment != "loopback" {
		t.Fatalf("expected first comment to be %q, got %q", "loopback", first.Comment)
	}
	if first.Disabled {
		t.Fatalf("expected first entry to be enabled")
	}

	second := parsed.Entries[1]
	if !second.Disabled {
		t.Fatalf("expected second entry to be disabled")
	}
	if second.Comment != "disabled entry" {
		t.Fatalf("expected disabled comment to be %q, got %q", "disabled entry", second.Comment)
	}
}

func TestParseHostsRejectsMalformedActiveEntry(t *testing.T) {
	_, err := ParseHosts("not-an-ip localhost")
	if err == nil {
		t.Fatal("expected ParseHosts to reject malformed active entries")
	}
}
