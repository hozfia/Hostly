package hosts

import "testing"

func TestActivateEntryPlansConflictDeactivation(t *testing.T) {
	parsed, err := ParseHosts("1.1.1.1 example.com\n# 2.2.2.2 Example.com")
	if err != nil {
		t.Fatalf("ParseHosts returned an error: %v", err)
	}

	target := parsed.Entries[1]
	plan, review := ActivateEntry(target, parsed)

	if len(plan.Activate) != 1 || plan.Activate[0] != 2 {
		t.Fatalf("expected activation plan for line 2, got %#v", plan.Activate)
	}
	if len(plan.Deactivate) != 1 || plan.Deactivate[0] != 1 {
		t.Fatalf("expected deactivation plan for line 1, got %#v", plan.Deactivate)
	}
	if len(review.Items) != 2 {
		t.Fatalf("expected 2 review items, got %d", len(review.Items))
	}
	if review.Items[0].Action != "ACTIVATE" || review.Items[0].Line != 2 {
		t.Fatalf("unexpected activate review item: %#v", review.Items[0])
	}
	if review.Items[1].Action != "DEACTIVATE" || review.Items[1].Line != 1 {
		t.Fatalf("unexpected deactivate review item: %#v", review.Items[1])
	}
}

func TestActivateEntryIgnoresDuplicateActiveEntry(t *testing.T) {
	parsed, err := ParseHosts("1.1.1.1 example.com\n# 1.1.1.1 EXAMPLE.com")
	if err != nil {
		t.Fatalf("ParseHosts returned an error: %v", err)
	}

	target := parsed.Entries[1]
	plan, review := ActivateEntry(target, parsed)

	if len(plan.Ignore) != 1 || plan.Ignore[0] != 2 {
		t.Fatalf("expected ignore plan for line 2, got %#v", plan.Ignore)
	}
	if len(plan.Activate) != 0 || len(plan.Deactivate) != 0 {
		t.Fatalf("expected no changes for duplicate activation, got %#v", plan)
	}
	if len(review.Items) != 1 || review.Items[0].Action != "IGNORE" {
		t.Fatalf("unexpected review for duplicate activation: %#v", review.Items)
	}
}

func TestActivateEntryRejectsInvalidIP(t *testing.T) {
	target := HostEntry{
		Line:      2,
		IP:        "999.999.999.999",
		Hostnames: []string{"example.com"},
		Disabled:  true,
	}

	plan, review := ActivateEntry(target, HostsFile{})

	if len(plan.Reject) != 1 {
		t.Fatalf("expected 1 reject entry, got %#v", plan.Reject)
	}
	if len(review.Items) != 1 || review.Items[0].Action != "REJECT" {
		t.Fatalf("unexpected reject review: %#v", review.Items)
	}
}

func TestDeactivateEntryPlansDeactivation(t *testing.T) {
	target := HostEntry{
		Line:      4,
		IP:        "1.1.1.1",
		Hostnames: []string{"example.com"},
		Disabled:  false,
	}

	plan, review := DeactivateEntry(target)

	if len(plan.Deactivate) != 1 || plan.Deactivate[0] != 4 {
		t.Fatalf("expected deactivation plan for line 4, got %#v", plan.Deactivate)
	}
	if len(review.Items) != 1 || review.Items[0].Action != "DEACTIVATE" {
		t.Fatalf("unexpected review for deactivation: %#v", review.Items)
	}
}

func TestBuildPlanCombinesFinalChanges(t *testing.T) {
	parsed, err := ParseHosts("1.1.1.1 old.local\n# 2.2.2.2 new.local")
	if err != nil {
		t.Fatalf("ParseHosts returned an error: %v", err)
	}

	plan, review := BuildPlan([]RequestedStateChange{
		{
			Target:   parsed.Entries[0],
			Activate: false,
		},
		{
			Target:   parsed.Entries[1],
			Activate: true,
		},
	}, parsed)

	if len(plan.Deactivate) != 1 || plan.Deactivate[0] != 1 {
		t.Fatalf("expected line 1 to be deactivated, got %#v", plan.Deactivate)
	}
	if len(plan.Activate) != 1 || plan.Activate[0] != 2 {
		t.Fatalf("expected line 2 to be activated, got %#v", plan.Activate)
	}
	if len(review.Items) != 2 {
		t.Fatalf("expected 2 review items, got %d", len(review.Items))
	}
}

func TestBuildPlanIgnoresAlreadyInactiveDeactivation(t *testing.T) {
	parsed, err := ParseHosts("# 1.1.1.1 example.com")
	if err != nil {
		t.Fatalf("ParseHosts returned an error: %v", err)
	}

	plan, review := BuildPlan([]RequestedStateChange{
		{
			Target:   parsed.Entries[0],
			Activate: false,
		},
	}, parsed)

	if len(plan.Activate) != 0 || len(plan.Deactivate) != 0 {
		t.Fatalf("expected no final changes, got %#v", plan)
	}
	if len(plan.Ignore) != 1 || plan.Ignore[0] != 1 {
		t.Fatalf("expected line 1 to be ignored, got %#v", plan.Ignore)
	}
	if len(review.Items) != 1 || review.Items[0].Action != "IGNORE" {
		t.Fatalf("unexpected review for already inactive deactivation: %#v", review.Items)
	}
}
