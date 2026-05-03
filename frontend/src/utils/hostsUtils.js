export const mapEntryToTableRow = (entry) => ({
  ...entry,
  id: `entry-${entry.line}`,
  hostnameLabel: entry.hostnames.join(", "),
});

export const buildRowsByLine = (entries) => {
  const rows = (entries || []).map(mapEntryToTableRow);
  return new Map(rows.map((row) => [row.line, row]));
};

export const createEntryItem = (row, id = row.id) => ({
  id,
  entryId: row.id,
  line: row.line,
  name: row.hostnameLabel,
  ip: row.ip,
  hostnames: [...row.hostnames],
  comment: row.comment || "",
  raw: row.raw,
  disabled: row.disabled,
  isActive: !row.disabled,
  hasPendingStateChange: false,
});

export const createGroupItem = (groupId, groupName, children) => ({
  id: groupId,
  name: groupName || "New Group",
  isActive: children.every((child) => child.isActive),
  hasPendingStateChange: false,
  children,
});

export const cloneSidebarItem = (item) => ({
  ...item,
  hostnames: item.hostnames ? [...item.hostnames] : undefined,
  children: item.children
    ? item.children.map((child) => cloneSidebarItem(child))
    : undefined,
  isActive: item.children?.length
    ? item.children.every((child) => child.isActive)
    : !!item.isActive,
  hasPendingStateChange: false,
});

export const itemContainsLine = (item, line) => {
  if (item.children?.length) {
    return item.children.some((child) => itemContainsLine(child, line));
  }
  return item.line === line;
};

export const syncItemWithEntries = (item, nextRowsByLine) => {
  if (item.children?.length) {
    const nextChildren = item.children.map((child) =>
      syncItemWithEntries(child, nextRowsByLine)
    );
    return {
      ...item,
      children: nextChildren,
      isActive: nextChildren.every((child) => child.isActive),
      hasPendingStateChange: false,
    };
  }

  const nextRow = nextRowsByLine.get(item.line);
  if (!nextRow) {
    return { ...item, hasPendingStateChange: false };
  }

  return {
    ...item,
    entryId: nextRow.id,
    line: nextRow.line,
    name: nextRow.hostnameLabel,
    ip: nextRow.ip,
    hostnames: [...nextRow.hostnames],
    comment: nextRow.comment || "",
    raw: nextRow.raw,
    disabled: nextRow.disabled,
    isActive: !nextRow.disabled,
    hasPendingStateChange: false,
  };
};

export const mapStoredEntryToSidebarItem = (entry) => ({
  id: entry.id,
  entryId: entry.entryId || `entry-${entry.line}`,
  line: entry.line || 0,
  name: entry.name,
  ip: entry.ip || "",
  hostnames: entry.hostnames ? [...entry.hostnames] : [],
  comment: entry.comment || "",
  raw: "",
  disabled: !entry.isActive,
  isActive: !!entry.isActive,
  hasPendingStateChange: false,
});

export const mapStoredGroupToSidebarItem = (group) => ({
  id: group.id,
  name: group.name || "New Group",
  isActive: !!group.isActive,
  hasPendingStateChange: false,
  children: [...(group.children || [])]
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map((child) => mapStoredEntryToSidebarItem(child)),
});

export const mapStoredGroupsToSidebarItems = (storedGroups, nextRowsByLine) =>
  [...(storedGroups || [])]
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
    .map((group) =>
      syncItemWithEntries(mapStoredGroupToSidebarItem(group), nextRowsByLine)
    );

export const buildStoredGroupsPayload = (itemsToStore) =>
  (itemsToStore || []).map((item, groupIndex) => ({
    id: item.id,
    name: item.name,
    isActive: item.children?.length
      ? item.children.every((child) => child.isActive)
      : !!item.isActive,
    sortOrder: groupIndex,
    children: (item.children || []).map((child, childIndex) => ({
      id: child.id,
      entryId: child.entryId || "",
      line: child.line || 0,
      name: child.name,
      ip: child.ip || "",
      hostnames: child.hostnames ? [...child.hostnames] : [],
      comment: child.comment || "",
      isActive: !!child.isActive,
      sortOrder: childIndex,
    })),
  }));

export const buildSavePayload = (itemsToSave) =>
  itemsToSave.map((item) => ({
    id: item.id,
    entryId: item.entryId || "",
    line: item.line || 0,
    name: item.name,
    ip: item.ip || "",
    hostnames: item.hostnames ? [...item.hostnames] : [],
    comment: item.comment || "",
    isActive: !!item.isActive,
    hasPendingStateChange: !!item.hasPendingStateChange,
    isEdit: !!item.isEdit,
    children: item.children
      ? item.children.map((child) => ({
          id: child.id,
          entryId: child.entryId || "",
          line: child.line || 0,
          name: child.name,
          ip: child.ip || "",
          hostnames: child.hostnames ? [...child.hostnames] : [],
          comment: child.comment || "",
          isActive: !!child.isActive,
        }))
      : [],
  }));
