package hosts

import (
	"strings"
	"testing"
)

func TestApplyEntryStates(t *testing.T) {
	content := strings.Join([]string{
		"127.0.0.1 localhost # loopback",
		"# 10.0.0.5 api.local admin.local # disabled entry",
		"# just a comment",
	}, "\n")

	updated, err := ApplyEntryStates(content, map[int]bool{
		1: false,
		2: true,
	})
	if err != nil {
		t.Fatalf("ApplyEntryStates returned an error: %v", err)
	}

	expected := strings.Join([]string{
		"# 127.0.0.1 localhost # loopback",
		"10.0.0.5 api.local admin.local # disabled entry",
		"# just a comment",
	}, "\n")

	if updated != expected {
		t.Fatalf("unexpected updated hosts content:\n%s", updated)
	}
}
