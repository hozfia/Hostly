package storage

// Group represents a saved sidebar group and its child host entries.
type Group struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	IsActive  bool         `json:"isActive"`
	SortOrder int          `json:"sortOrder"`
	Children  []GroupEntry `json:"children,omitempty"`
}

// GroupEntry represents a single host entry stored under a group.
type GroupEntry struct {
	ID        string   `json:"id"`
	EntryID   string   `json:"entryId,omitempty"`
	Line      int      `json:"line,omitempty"`
	Name      string   `json:"name"`
	IP        string   `json:"ip,omitempty"`
	Hostnames []string `json:"hostnames,omitempty"`
	Comment   string   `json:"comment,omitempty"`
	IsActive  bool     `json:"isActive"`
	SortOrder int      `json:"sortOrder"`
}
