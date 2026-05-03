import React, { useEffect, useRef, useState } from "react";
import { ToastContainer } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useDispatch, useSelector } from "react-redux";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ContentTable from "../components/ContentTable";
import CommitDialog from "../components/dialogs/CommitDialog";

import { setSearchValue } from "../store/uiSlice";
import { setItems } from "../store/groupsSlice";
import {
  addToCurrentSelected,
  clearCurrentSelected,
  closeCommitDialog,
  toggleItemActive,
} from "../store/selectionSlice";
import {
  applyCommitThunk,
  openHostsFileThunk,
  persistGroupsThunk,
  previewCommitThunk,
} from "../store/thunks";
import {
  cloneSidebarItem,
  createEntryItem,
  createGroupItem,
  itemContainsLine,
  mapEntryToTableRow,
} from "../utils/hostsUtils";

const MainLayout = () => {
  const dispatch = useDispatch();
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const searchValue = useSelector((state) => state.ui.searchValue);
  const hostEntries = useSelector((state) => state.hosts.entries);
  const selectedFilePath = useSelector((state) => state.hosts.filePath);
  const selectedFileName = useSelector((state) => state.hosts.fileName);
  const isLoadingHostsFile = useSelector((state) => state.hosts.isLoading);
  const loadError = useSelector((state) => state.hosts.loadError);
  const items = useSelector((state) => state.groups.items);
  const currentSelectedItems = useSelector((state) => state.selection.currentSelectedItems);
  const isCommitDialogOpen = useSelector((state) => state.selection.isCommitDialogOpen);
  const commitPreview = useSelector((state) => state.selection.commitPreview);

  const hasRequestedInitialFile = useRef(false);
  const isOpeningFileRef = useRef(false);

  const tableRows = hostEntries.map(mapEntryToTableRow);
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const itemMatchesSearch = (item, searchTerm) => {
    if (!searchTerm) return true;
    if ((item.name || "").toLowerCase().includes(searchTerm)) return true;
    return (item.children || []).some((child) => itemMatchesSearch(child, searchTerm));
  };

  const filteredTableRows = normalizedSearchValue
    ? tableRows.filter((row) =>
        [row.hostnameLabel, row.ip, row.comment, row.raw, row.disabled ? "disabled" : "active"].some(
          (value) => String(value || "").toLowerCase().includes(normalizedSearchValue)
        )
      )
    : tableRows;

  const filteredRootItems = normalizedSearchValue
    ? items.filter((item) => itemMatchesSearch(item, normalizedSearchValue))
    : items;

  useEffect(() => {
    if (hasRequestedInitialFile.current) return;
    hasRequestedInitialFile.current = true;
    void openHostsFile();
  }, []);

  useEffect(() => {
    if (selectedKeys === "all") {
      setSelectedKeys(new Set(filteredTableRows.map((row) => row.id)));
      return;
    }

    setSelectedKeys((prev) => {
      const visibleRowIds = new Set(filteredTableRows.map((row) => row.id));
      const nextKeys = [...prev].filter((key) => visibleRowIds.has(key));
      if (nextKeys.length === prev.size) return prev;
      return new Set(nextKeys);
    });
  }, [filteredTableRows, selectedKeys]);

  const openHostsFile = async () => {
    if (isOpeningFileRef.current) return;
    isOpeningFileRef.current = true;
    try {
      await dispatch(openHostsFileThunk());
    } finally {
      isOpeningFileRef.current = false;
    }
  };

  const handleConfirmGrouping = ({ selected, groupName }) => {
    const selectedItems =
      selected.length === 1 && selected[0] === "ALL"
        ? tableRows
        : tableRows.filter((row) => selected.includes(row.id));

    const existing = items.find((group) => group.name === groupName);
    let nextItems;

    if (existing) {
      const existingEntryIDs = new Set(
        (existing.children || []).map((child) => child.entryId)
      );
      const nextChildren = selectedItems
        .filter((item) => !existingEntryIDs.has(item.id))
        .map((item, index) =>
          createEntryItem(item, `${existing.id}-${Date.now()}-${index}`)
        );

      nextItems = items.map((group) =>
        group.name === groupName
          ? {
              ...group,
              children: [...group.children, ...nextChildren],
              isActive: [...group.children, ...nextChildren].every((child) => child.isActive),
              hasPendingStateChange: false,
            }
          : group
      );
    } else {
      const groupID = `group-${Date.now()}`;
      const children = selectedItems.map((item, index) =>
        createEntryItem(item, `${groupID}-entry-${item.line}-${index}`)
      );
      nextItems = [...items, createGroupItem(groupID, groupName, children)];
    }

    dispatch(setItems(nextItems));
    dispatch(persistGroupsThunk(nextItems));
  };

  const handleAddSelectedRowsToCurrent = (rowsToAdd) => {
    if (!rowsToAdd?.length) return;

    const newItems = rowsToAdd
      .filter((row) => !currentSelectedItems.some((item) => itemContainsLine(item, row.line)))
      .map((row) => createEntryItem(row));

    if (newItems.length > 0) {
      dispatch(addToCurrentSelected(newItems));
    }
    setSelectedKeys(new Set());
  };

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
        onSearchChange={(value) => dispatch(setSearchValue(value))}
        onSavePress={() => dispatch(previewCommitThunk())}
        onOpenHostsPress={() => void openHostsFile()}
        onClearPress={() => dispatch(clearCurrentSelected())}
      />

      <div className={style({ display: "flex", flex: 1 })}>
        <Sidebar
          items={filteredRootItems}
          currentSelectedItems={currentSelectedItems}
          onToggleCurrentItemActive={(itemId, isActive) =>
            dispatch(toggleItemActive({ itemId, isActive }))
          }
          onAddToCurrent={(item) => {
            const cloned = cloneSidebarItem(item);
            if (!currentSelectedItems.find((existing) => existing.id === cloned.id)) {
              dispatch(addToCurrentSelected([cloned]));
            }
          }}
        />

        <ContentTable
          rows={filteredTableRows}
          selected={selectedKeys}
          setSelected={setSelectedKeys}
          onConfirmGrouping={handleConfirmGrouping}
          onAddSelectedToCurrent={handleAddSelectedRowsToCurrent}
          existingGroups={items.map((item) => item.name)}
          filePath={selectedFilePath}
          fileName={selectedFileName}
          isLoading={isLoadingHostsFile}
          errorMessage={loadError}
          onOpenHostsFile={() => void openHostsFile()}
        />
      </div>

      <CommitDialog
        isOpen={isCommitDialogOpen}
        onClose={() => dispatch(closeCommitDialog())}
        reviewItems={commitPreview?.review?.items || []}
        plan={commitPreview?.plan || null}
        description="Review the planned hosts file changes before continuing."
        onConfirm={() => dispatch(applyCommitThunk())}
      />

      <ToastContainer />
    </div>
  );
};

export default MainLayout;
