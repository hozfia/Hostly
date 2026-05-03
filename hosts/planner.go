package hosts

import (
	"fmt"
	"net"
	"sort"
	"strings"
)

const (
	actionActivate   = "ACTIVATE"
	actionDeactivate = "DEACTIVATE"
	actionIgnore     = "IGNORE"
	actionReject     = "REJECT"
)

// Plan describes the final line-level changes to apply to a hosts file.
type Plan struct {
	Activate      []int       `json:"activate"`
	Deactivate    []int       `json:"deactivate"`
	Ignore        []int       `json:"ignore"`
	Reject        []string    `json:"reject"`
	AppendEntries []HostEntry `json:"appendEntries"`
}

// ReviewItem is a structured review row for the UI.
type ReviewItem struct {
	Action string   `json:"action"`
	Line   int      `json:"line"`
	IP     string   `json:"ip"`
	Hosts  []string `json:"hosts"`
	Reason string   `json:"reason"`
}

// ReviewSummary contains the review rows shown before commit.
type ReviewSummary struct {
	Items []ReviewItem `json:"items"`
}

// RequestedStateChange is an internal planning input for multi-entry previews.
type RequestedStateChange struct {
	Target   HostEntry `json:"target"`
	Activate bool      `json:"activate"`
}

// ActivateEntry plans how to activate a single entry without mutating the hosts file.
func ActivateEntry(target HostEntry, hosts HostsFile) (Plan, ReviewSummary) {
	plan := newPlan()
	review := newReviewSummary()

	if target.Line <= 0 {
		return rejectPlan(plan, review, target, "missing line number")
	}

	targetIP := net.ParseIP(strings.TrimSpace(target.IP))
	if targetIP == nil {
		return rejectPlan(plan, review, target, "invalid IP")
	}

	normalizedTargetHosts := normalizedHostnames(target.Hostnames)
	if len(normalizedTargetHosts) == 0 {
		return rejectPlan(plan, review, target, "no hostnames")
	}

	if !target.Disabled {
		plan.Ignore = append(plan.Ignore, target.Line)
		review.Items = append(review.Items, reviewItem(actionIgnore, target, "already active"))
		return plan, review
	}

	targetHostSet := make(map[string]struct{}, len(normalizedTargetHosts))
	for _, host := range normalizedTargetHosts {
		targetHostSet[host] = struct{}{}
	}

	duplicates := make(map[int]HostEntry)
	conflicts := make(map[int]HostEntry)

	for _, entry := range hosts.Entries {
		if entry.Disabled || entry.Line == target.Line {
			continue
		}

		if !entryHasHostname(entry, targetHostSet) {
			continue
		}

		if ipsEqual(entry.IP, target.IP) {
			duplicates[entry.Line] = cloneHostEntry(entry)
			continue
		}

		conflicts[entry.Line] = cloneHostEntry(entry)
	}

	if len(duplicates) > 0 {
		duplicateLines := sortedEntryLines(duplicates)
		plan.Ignore = append(plan.Ignore, target.Line)
		review.Items = append(
			review.Items,
			reviewItem(
				actionIgnore,
				target,
				fmt.Sprintf("duplicate active entry already exists on line(s) %s", joinLineNumbers(duplicateLines)),
			),
		)
		return plan, review
	}

	plan.Activate = append(plan.Activate, target.Line)
	review.Items = append(review.Items, reviewItem(actionActivate, target, "user requested activation"))

	for _, line := range sortedEntryLines(conflicts) {
		conflictingEntry := conflicts[line]
		plan.Deactivate = append(plan.Deactivate, conflictingEntry.Line)
		review.Items = append(
			review.Items,
			reviewItem(actionDeactivate, conflictingEntry, "conflict with activated entry"),
		)
	}

	return plan, review
}

// DeactivateEntry plans how to deactivate a single entry without mutating the hosts file.
func DeactivateEntry(target HostEntry) (Plan, ReviewSummary) {
	plan := newPlan()
	review := newReviewSummary()

	plan.Deactivate = append(plan.Deactivate, target.Line)
	review.Items = append(review.Items, reviewItem(actionDeactivate, target, "user requested deactivation"))

	return plan, review
}

// BuildPlan creates a final plan/review for multiple requested state changes.
func BuildPlan(requests []RequestedStateChange, hostsFile HostsFile) (Plan, ReviewSummary) {
	dedupedRequests := dedupeRequestedStateChanges(requests)
	initialHosts := cloneHostsFile(hostsFile)
	workingHosts := cloneHostsFile(hostsFile)

	requestOrder := make([]int, 0, len(dedupedRequests))
	requestsByLine := make(map[int]RequestedStateChange, len(dedupedRequests))
	requestOutcomesByLine := make(map[int]ReviewItem, len(dedupedRequests))
	rejectedRequestLines := make(map[int]struct{}, len(dedupedRequests))
	rejectItems := make([]ReviewItem, 0)
	appendEntries := make([]HostEntry, 0)
	appendReviewItems := make([]ReviewItem, 0)

	for _, request := range dedupedRequests {
		// Entries with no line number are new entries to be appended to the file.
		if request.Target.Line == 0 {
			if request.Activate {
				appendEntries = append(appendEntries, cloneHostEntry(request.Target))
				appendReviewItems = append(appendReviewItems, reviewItem(actionActivate, request.Target, "new entry"))
			}
			continue
		}

		if request.Target.Line > 0 {
			requestOrder = append(requestOrder, request.Target.Line)
			requestsByLine[request.Target.Line] = cloneRequestedStateChange(request)
		}

		var (
			plan   Plan
			review ReviewSummary
		)

		if request.Activate {
			plan, review = ActivateEntry(request.Target, workingHosts)
		} else {
			plan, review = DeactivateEntry(request.Target)
		}

		for _, item := range review.Items {
			if item.Action == actionReject {
				if item.Line > 0 {
					rejectedRequestLines[item.Line] = struct{}{}
				}
				rejectItems = append(rejectItems, cloneReviewItem(item))
				continue
			}

			if item.Line == request.Target.Line && item.Line > 0 {
				requestOutcomesByLine[item.Line] = cloneReviewItem(item)
			}
		}

		workingHosts = applyPlanInMemory(workingHosts, plan)
	}

	finalPlan := diffHostsFiles(initialHosts, workingHosts)
	finalPlan.Ignore = make([]int, 0)
	finalPlan.Reject = make([]string, 0, len(rejectItems))

	review := newReviewSummary()

	for _, line := range finalPlan.Activate {
		request := requestsByLine[line]
		item, ok := requestOutcomesByLine[line]
		if !ok || item.Action != actionActivate {
			entry, found := entryByLine(workingHosts, line)
			if !found {
				entry = request.Target
			}
			item = reviewItem(actionActivate, entry, "user requested activation")
		}
		review.Items = append(review.Items, item)
	}

	for _, line := range finalPlan.Deactivate {
		request, requested := requestsByLine[line]
		entry, found := entryByLine(initialHosts, line)
		if !found {
			entry = request.Target
		}

		item := reviewItem(actionDeactivate, entry, "conflict with activated entry")
		if requested && !request.Activate {
			if outcome, ok := requestOutcomesByLine[line]; ok && outcome.Action == actionDeactivate {
				item = outcome
			} else {
				item = reviewItem(actionDeactivate, entry, "user requested deactivation")
			}
		}

		review.Items = append(review.Items, item)
	}

	activatedLines := sliceToLineSet(finalPlan.Activate)
	deactivatedLines := sliceToLineSet(finalPlan.Deactivate)

	for _, line := range requestOrder {
		if _, ok := rejectedRequestLines[line]; ok {
			continue
		}
		if _, ok := activatedLines[line]; ok {
			continue
		}
		if _, ok := deactivatedLines[line]; ok {
			continue
		}

		request := requestsByLine[line]
		entry, found := entryByLine(initialHosts, line)
		if !found {
			entry = request.Target
		}

		ignoreItem := reviewItem(actionIgnore, entry, "no change required")
		if outcome, ok := requestOutcomesByLine[line]; ok && outcome.Action == actionIgnore {
			ignoreItem = outcome
		} else if request.Activate {
			if !entry.Disabled {
				ignoreItem = reviewItem(actionIgnore, entry, "already active")
			} else {
				ignoreItem = reviewItem(actionIgnore, entry, "activation was superseded by another planned change")
			}
		} else {
			if entry.Disabled {
				ignoreItem = reviewItem(actionIgnore, entry, "already inactive")
			} else {
				ignoreItem = reviewItem(actionIgnore, entry, "deactivation was superseded by another planned change")
			}
		}

		finalPlan.Ignore = append(finalPlan.Ignore, line)
		review.Items = append(review.Items, ignoreItem)
	}

	for _, item := range rejectItems {
		finalPlan.Reject = append(finalPlan.Reject, formatRejectMessage(item))
		review.Items = append(review.Items, item)
	}

	finalPlan.AppendEntries = appendEntries
	review.Items = append(review.Items, appendReviewItems...)

	sort.Ints(finalPlan.Ignore)

	return finalPlan, review
}

func newPlan() Plan {
	return Plan{
		Activate:      []int{},
		Deactivate:    []int{},
		Ignore:        []int{},
		Reject:        []string{},
		AppendEntries: []HostEntry{},
	}
}

func newReviewSummary() ReviewSummary {
	return ReviewSummary{
		Items: []ReviewItem{},
	}
}

func rejectPlan(plan Plan, review ReviewSummary, target HostEntry, reason string) (Plan, ReviewSummary) {
	plan.Reject = append(plan.Reject, formatRejectMessage(reviewItem(actionReject, target, reason)))
	review.Items = append(review.Items, reviewItem(actionReject, target, reason))
	return plan, review
}

func reviewItem(action string, entry HostEntry, reason string) ReviewItem {
	return ReviewItem{
		Action: action,
		Line:   entry.Line,
		IP:     entry.IP,
		Hosts:  append([]string(nil), entry.Hostnames...),
		Reason: reason,
	}
}

func formatRejectMessage(item ReviewItem) string {
	if item.Line > 0 {
		return fmt.Sprintf("line %d: %s", item.Line, item.Reason)
	}

	return item.Reason
}

func normalizedHostnames(hosts []string) []string {
	seen := make(map[string]struct{}, len(hosts))
	normalized := make([]string, 0, len(hosts))

	for _, host := range hosts {
		next := strings.ToLower(strings.TrimSpace(host))
		if next == "" {
			continue
		}
		if _, ok := seen[next]; ok {
			continue
		}
		seen[next] = struct{}{}
		normalized = append(normalized, next)
	}

	return normalized
}

func entryHasHostname(entry HostEntry, targetHostSet map[string]struct{}) bool {
	for _, hostname := range normalizedHostnames(entry.Hostnames) {
		if _, ok := targetHostSet[hostname]; ok {
			return true
		}
	}

	return false
}

func ipsEqual(left, right string) bool {
	leftIP := net.ParseIP(strings.TrimSpace(left))
	rightIP := net.ParseIP(strings.TrimSpace(right))
	if leftIP == nil || rightIP == nil {
		return strings.TrimSpace(left) == strings.TrimSpace(right)
	}

	return leftIP.Equal(rightIP)
}

func sortedEntryLines(entries map[int]HostEntry) []int {
	lines := make([]int, 0, len(entries))
	for line := range entries {
		lines = append(lines, line)
	}
	sort.Ints(lines)
	return lines
}

func joinLineNumbers(lines []int) string {
	values := make([]string, 0, len(lines))
	for _, line := range lines {
		values = append(values, fmt.Sprintf("%d", line))
	}
	return strings.Join(values, ", ")
}

func cloneHostsFile(hostsFile HostsFile) HostsFile {
	cloned := HostsFile{
		Entries: make([]HostEntry, len(hostsFile.Entries)),
	}

	for index, entry := range hostsFile.Entries {
		cloned.Entries[index] = cloneHostEntry(entry)
	}

	return cloned
}

func cloneHostEntry(entry HostEntry) HostEntry {
	return HostEntry{
		Line:      entry.Line,
		Raw:       entry.Raw,
		IP:        entry.IP,
		Hostnames: append([]string(nil), entry.Hostnames...),
		Comment:   entry.Comment,
		Disabled:  entry.Disabled,
	}
}

func cloneRequestedStateChange(change RequestedStateChange) RequestedStateChange {
	return RequestedStateChange{
		Target:   cloneHostEntry(change.Target),
		Activate: change.Activate,
	}
}

func cloneReviewItem(item ReviewItem) ReviewItem {
	return ReviewItem{
		Action: item.Action,
		Line:   item.Line,
		IP:     item.IP,
		Hosts:  append([]string(nil), item.Hosts...),
		Reason: item.Reason,
	}
}

func dedupeRequestedStateChanges(requests []RequestedStateChange) []RequestedStateChange {
	deduped := make([]RequestedStateChange, 0, len(requests))
	indexByKey := make(map[string]int, len(requests))

	for _, request := range requests {
		key := requestedStateChangeKey(request)
		cloned := cloneRequestedStateChange(request)

		if index, ok := indexByKey[key]; ok {
			deduped[index] = cloned
			continue
		}

		indexByKey[key] = len(deduped)
		deduped = append(deduped, cloned)
	}

	return deduped
}

func requestedStateChangeKey(request RequestedStateChange) string {
	if request.Target.Line > 0 {
		return fmt.Sprintf("line:%d", request.Target.Line)
	}

	normalized := normalizedHostnames(request.Target.Hostnames)
	return fmt.Sprintf(
		"target:%s|%s",
		strings.TrimSpace(request.Target.IP),
		strings.Join(normalized, ","),
	)
}

func applyPlanInMemory(hostsFile HostsFile, plan Plan) HostsFile {
	next := cloneHostsFile(hostsFile)
	entryStates := make(map[int]bool, len(plan.Activate)+len(plan.Deactivate))

	for _, line := range plan.Activate {
		entryStates[line] = true
	}
	for _, line := range plan.Deactivate {
		entryStates[line] = false
	}

	for index, entry := range next.Entries {
		isActive, ok := entryStates[entry.Line]
		if !ok {
			continue
		}

		next.Entries[index].Disabled = !isActive
	}

	return next
}

func diffHostsFiles(initial HostsFile, final HostsFile) Plan {
	plan := newPlan()
	initialByLine := make(map[int]HostEntry, len(initial.Entries))

	for _, entry := range initial.Entries {
		initialByLine[entry.Line] = entry
	}

	for _, entry := range final.Entries {
		initialEntry, ok := initialByLine[entry.Line]
		if !ok || initialEntry.Disabled == entry.Disabled {
			continue
		}

		if entry.Disabled {
			plan.Deactivate = append(plan.Deactivate, entry.Line)
			continue
		}

		plan.Activate = append(plan.Activate, entry.Line)
	}

	sort.Ints(plan.Activate)
	sort.Ints(plan.Deactivate)

	return plan
}

func entryByLine(hostsFile HostsFile, line int) (HostEntry, bool) {
	for _, entry := range hostsFile.Entries {
		if entry.Line == line {
			return cloneHostEntry(entry), true
		}
	}

	return HostEntry{}, false
}

func sliceToLineSet(lines []int) map[int]struct{} {
	set := make(map[int]struct{}, len(lines))
	for _, line := range lines {
		set[line] = struct{}{}
	}
	return set
}
