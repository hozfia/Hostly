import React, { useEffect, useRef, useState } from "react";
import { ToastContainer, ToastQueue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  LoadStoredGroups,
  SaveHostsSelection,
  SaveStoredGroups,
  SelectHostsFile,
} from "../../wailsjs/go/main/App";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ContentTable from "../components/ContentTable";
import CommitDialog from "../components/dialogs/CommitDialog";
import Folder from "@react-spectrum/s2/icons/Folder";
import File from "@react-spectrum/s2/icons/File";

const MainLayout = () => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [currentSelectedItems, setCurrentSelectedItems] = useState([]);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [hostEntries, setHostEntries] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingHostsFile, setIsLoadingHostsFile] = useState(false);
  const [items, setItems] = useState([]);
  const hasRequestedInitialFile = useRef(false);
  const isOpeningFileRef = useRef(false);
  const itemsRef = useRef([]);
  const currentSelectedItemsRef = useRef([]);

  const mapEntryToTableRow = (entry) => ({
    ...entry,
    id: `entry-${entry.line}`,
    hostnameLabel: entry.hostnames.join(", "),
  });

  const createEntryItem = (row, id = row.id) => ({
    id,
    entryId: row.id,
    line: row.line,
    name: row.hostnameLabel,
    icon: <File />,
    ip: row.ip,
    hostnames: [...row.hostnames],
    comment: row.comment || "",
    raw: row.raw,
    disabled: row.disabled,
    isActive: !row.disabled,
    hasPendingStateChange: false,
  });

  const createGroupItem = (groupId, groupName, children) => ({
    id: groupId,
    name: groupName || "New Group",
    icon: <Folder />,
    isActive: children.every((child) => child.isActive),
    hasPendingStateChange: false,
    children,
  });

  const cloneSidebarItem = (item) => ({
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

  const syncItemWithEntries = (item, nextRowsByLine) => {
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
      return {
        ...item,
        hasPendingStateChange: false,
      };
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

  const mapStoredEntryToSidebarItem = (entry) => ({
    id: entry.id,
    entryId: entry.entryId || `entry-${entry.line}`,
    line: entry.line || 0,
    name: entry.name,
    icon: <File />,
    ip: entry.ip || "",
    hostnames: entry.hostnames ? [...entry.hostnames] : [],
    comment: entry.comment || "",
    raw: "",
    disabled: !entry.isActive,
    isActive: !!entry.isActive,
    hasPendingStateChange: false,
  });

  const mapStoredGroupToSidebarItem = (group) => ({
    id: group.id,
    name: group.name || "New Group",
    icon: <Folder />,
    isActive: !!group.isActive,
    hasPendingStateChange: false,
    children: [...(group.children || [])]
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
      .map((child) => mapStoredEntryToSidebarItem(child)),
  });

  const buildRowsByLine = (entries) => {
    const nextRows = (entries || []).map((entry) => mapEntryToTableRow(entry));
    return new Map(nextRows.map((row) => [row.line, row]));
  };

  const mapStoredGroupsToSidebarItems = (storedGroups, nextRowsByLine) =>
    [...(storedGroups || [])]
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
      .map((group) =>
        syncItemWithEntries(mapStoredGroupToSidebarItem(group), nextRowsByLine)
      );

  const buildStoredGroupsPayload = (itemsToStore) =>
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

  const persistStoredGroups = async (itemsToStore) => {
    try {
      await SaveStoredGroups(buildStoredGroupsPayload(itemsToStore));
    } catch (error) {
      ToastQueue.negative(
        `Unable to save groups to SQLite: ${error?.message || String(error)}`,
        {
          timeout: 5000,
        }
      );
    }
  };

  const loadStoredGroupItems = async (entries) => {
    try {
      const storedGroups = await LoadStoredGroups();
      return mapStoredGroupsToSidebarItems(storedGroups, buildRowsByLine(entries));
    } catch (error) {
      ToastQueue.negative(
        `Unable to load saved groups from SQLite: ${error?.message || String(error)}`,
        {
          timeout: 5000,
        }
      );
      return [];
    }
  };

  const tableRows = hostEntries.map((entry) => mapEntryToTableRow(entry));
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const itemMatchesSearch = (item, searchTerm) => {
    if (!searchTerm) {
      return true;
    }

    if ((item.name || "").toLowerCase().includes(searchTerm)) {
      return true;
    }

    return (item.children || []).some((child) => itemMatchesSearch(child, searchTerm));
  };

  const filteredTableRows = normalizedSearchValue
    ? tableRows.filter((row) =>
        [
          row.hostnameLabel,
          row.ip,
          row.comment,
          row.raw,
          row.disabled ? "disabled" : "active",
        ].some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearchValue)
        )
      )
    : tableRows;

  const filteredRootItems = normalizedSearchValue
    ? items.filter((item) => itemMatchesSearch(item, normalizedSearchValue))
    : items;

  const applySavedHostsSelection = async (result) => {
    const nextEntries = result.entries || [];
    const nextRowsByLine = buildRowsByLine(nextEntries);
    const nextItems = itemsRef.current.map((item) =>
      syncItemWithEntries(item, nextRowsByLine)
    );
    const nextCurrentSelectedItems = currentSelectedItemsRef.current.map((item) =>
      syncItemWithEntries(item, nextRowsByLine)
    );

    setHostEntries(nextEntries);
    setSelectedFilePath(result.path || "");
    setSelectedFileName(result.fileName || "");
    setItems(nextItems);
    setCurrentSelectedItems(nextCurrentSelectedItems);

    await persistStoredGroups(nextItems);
  };

  const applyHostsSelection = (result, storedGroupItems = []) => {
    setHostEntries(result.entries || []);
    setSelectedFilePath(result.path || "");
    setSelectedFileName(result.fileName || "");
    setSelectedKeys(new Set());
    setCurrentSelectedItems([]);
    setItems(storedGroupItems);
    ToastQueue.positive(`Loaded ${result.fileName || "hosts file"} successfully.`, {
      timeout: 5000,
    });
  };

  const openHostsFile = async () => {
    if (isOpeningFileRef.current) {
      return;
    }

    isOpeningFileRef.current = true;

    setIsLoadingHostsFile(true);
    setLoadError("");

    try {
      const result = await SelectHostsFile();

      if (!result || result.cancelled) {
        return;
      }

      const storedGroupItems = await loadStoredGroupItems(result.entries || []);
      applyHostsSelection(result, storedGroupItems);
    } catch (error) {
      const message = error?.message || String(error);
      setLoadError(message);
      ToastQueue.negative(message, {
        timeout: 5000,
      });
    } finally {
      setIsLoadingHostsFile(false);
      isOpeningFileRef.current = false;
    }
  };

  const clearCurrentSelectedHosts = () => {
    setCurrentSelectedItems([]);
  };

  useEffect(() => {
    if (hasRequestedInitialFile.current) {
      return;
    }

    hasRequestedInitialFile.current = true;
    void openHostsFile();
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    currentSelectedItemsRef.current = currentSelectedItems;
  }, [currentSelectedItems]);

  useEffect(() => {
    if (selectedKeys === "all") {
      setSelectedKeys(new Set(filteredTableRows.map((row) => row.id)));
      return;
    }

    setSelectedKeys((prev) => {
      const visibleRowIds = new Set(filteredTableRows.map((row) => row.id));
      const nextKeys = [...prev].filter((key) => visibleRowIds.has(key));

      if (nextKeys.length === prev.size) {
        return prev;
      }

      return new Set(nextKeys);
    });
  }, [filteredTableRows, selectedKeys]);

  const handleConfirmGrouping = ({ selected, groupName }) => {
    const selectedItems =
      selected.length === 1 && selected[0] === "ALL"
        ? tableRows
        : tableRows.filter((row) => selected.includes(row.id));

    const previousItems = itemsRef.current;
    const existing = previousItems.find((group) => group.name === groupName);

    let nextItems = previousItems;

    if (existing) {
      const existingEntryIDs = new Set(
        (existing.children || []).map((child) => child.entryId)
      );
      const nextChildren = selectedItems
        .filter((item) => !existingEntryIDs.has(item.id))
        .map((item, index) =>
          createEntryItem(item, `${existing.id}-${Date.now()}-${index}`)
        );

      nextItems = previousItems.map((group) =>
        group.name === groupName
          ? {
              ...group,
              children: [...group.children, ...nextChildren],
              isActive: [...group.children, ...nextChildren].every(
                (child) => child.isActive
              ),
              hasPendingStateChange: false,
            }
          : group
      );
    } else {
      const groupID = `group-${Date.now()}`;
      const children = selectedItems.map((item, index) =>
        createEntryItem(item, `${groupID}-entry-${item.line}-${index}`)
      );

      nextItems = [...previousItems, createGroupItem(groupID, groupName, children)];
    }

    setItems(nextItems);
    void persistStoredGroups(nextItems);
  };

  const handleToggleCurrentItemActive = (itemId, isActive) => {
    setCurrentSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isActive,
              hasPendingStateChange: true,
            }
          : item
      )
    );
  };

  const buildSavePayload = (itemsToSave) =>
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

  return (
    <div
      className={style({
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      })}
    >
      <Header
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSavePress={() => setIsCommitDialogOpen(true)}
        onOpenHostsPress={() => {
          void openHostsFile();
        }}
        onClearPress={clearCurrentSelectedHosts}
      />

      <div className={style({ display: "flex", flex: 1 })}>
        <Sidebar
          items={filteredRootItems}
          currentSelectedItems={currentSelectedItems}
          onToggleCurrentItemActive={handleToggleCurrentItemActive}
          onAddToCurrent={(item) => {
            setCurrentSelectedItems((prev) => {
              if (prev.find((currentItem) => currentItem.id === item.id)) {
                return prev;
              }

              return [...prev, cloneSidebarItem(item)];
            });
          }}
        />

        <ContentTable
          rows={filteredTableRows}
          selected={selectedKeys}
          setSelected={setSelectedKeys}
          onConfirmGrouping={handleConfirmGrouping}
          existingGroups={items.map((item) => item.name)}
          filePath={selectedFilePath}
          fileName={selectedFileName}
          isLoading={isLoadingHostsFile}
          errorMessage={loadError}
          onOpenHostsFile={() => {
            void openHostsFile();
          }}
        />
      </div>

      <CommitDialog
        isOpen={isCommitDialogOpen}
        onClose={() => setIsCommitDialogOpen(false)}
        items={currentSelectedItems}
        onConfirm={async (selectedItems) => {
          if (!selectedFilePath) {
            ToastQueue.negative("Open a hosts file from disk before committing changes.", {
              timeout: 5000,
            });
            return;
          }

          const payload = buildSavePayload(selectedItems);
          try {
            const result = await SaveHostsSelection(selectedFilePath, payload);
            await applySavedHostsSelection(result);
            ToastQueue.positive("Commit completed successfully.", {
              timeout: 5000,
            });
          } catch (error) {
            ToastQueue.negative(error?.message || String(error), {
              timeout: 5000,
            });
          }
        }}
      />

      <ToastContainer />
    </div>
  );
};

export default MainLayout;
