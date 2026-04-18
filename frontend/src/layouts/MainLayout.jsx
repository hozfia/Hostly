import React, { useEffect, useRef, useState } from "react";
import { ToastContainer, ToastQueue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { SelectHostsFile } from "../../wailsjs/go/main/App";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ContentTable from "../components/ContentTable";
import CommitDialog from "../components/dialogs/CommitDialog";
import Folder from "@react-spectrum/s2/icons/Folder";
import File from "@react-spectrum/s2/icons/File";
import { parseHostsContent } from "../utils/hostsParser";

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
  const fileInputRef = useRef(null);
  const isOpeningFileRef = useRef(false);

  const tableRows = hostEntries.map((entry) => ({
    ...entry,
    id: `entry-${entry.line}`,
    hostnameLabel: entry.hostnames.join(", "),
  }));
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

  const applyHostsSelection = (result) => {
    setHostEntries(result.entries || []);
    setSelectedFilePath(result.path || "");
    setSelectedFileName(result.fileName || "");
    setSelectedKeys(new Set());
    setCurrentSelectedItems([]);
    setItems([]);
    ToastQueue.positive(`Loaded ${result.fileName || "hosts file"} successfully.`, {
      timeout: 5000,
    });
  };

  const openBrowserFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openHostsFile = async ({ allowBrowserFallback = true } = {}) => {
    if (isOpeningFileRef.current) {
      return;
    }

    isOpeningFileRef.current = true;

    if (!window.go?.main?.App?.SelectHostsFile) {
      setLoadError("The native Wails file dialog is not ready. Using the browser file picker instead.");
      if (allowBrowserFallback) {
        openBrowserFilePicker();
      }
      isOpeningFileRef.current = false;
      return;
    }

    setIsLoadingHostsFile(true);
    setLoadError("");

    try {
      const result = await SelectHostsFile();

      if (!result || result.cancelled) {
        return;
      }

      applyHostsSelection(result);
    } catch (error) {
      const message = error?.message || String(error);
      setLoadError(message);

      if (allowBrowserFallback) {
        openBrowserFilePicker();
      }
    } finally {
      setIsLoadingHostsFile(false);
      isOpeningFileRef.current = false;
    }
  };

  const handleBrowserFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsLoadingHostsFile(true);
    setLoadError("");

    try {
      const content = await file.text();
      const parsed = parseHostsContent(content);

      applyHostsSelection({
        path: "",
        fileName: file.name,
        entries: parsed.entries,
        cancelled: false,
      });
    } catch (error) {
      const message = error?.message || String(error);
      setLoadError(message);
    } finally {
      setIsLoadingHostsFile(false);
    }
  };

  const clearHostsData = () => {
    setHostEntries([]);
    setSelectedFilePath("");
    setSelectedFileName("");
    setLoadError("");
    setSelectedKeys(new Set());
    setCurrentSelectedItems([]);
    setItems([]);
  };

  useEffect(() => {
    if (hasRequestedInitialFile.current) {
      return;
    }

    hasRequestedInitialFile.current = true;
    void openHostsFile({ allowBrowserFallback: false });
  }, []);

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

    setItems((prev) => {
      const existing = prev.find((group) => group.name === groupName);

      if (existing) {
        return prev.map((group) =>
          group.name === groupName
            ? {
                ...group,
                children: [
                  ...group.children,
                  ...selectedItems.map((item) => ({
                    id: `${item.id}-${Date.now()}`,
                    name: item.hostnameLabel,
                    icon: <File />,
                  })),
                ],
              }
            : group
        );
      }

      return [
        ...prev,
        {
          id: `group-${Date.now()}`,
          name: groupName || "New Group",
          icon: <Folder />,
          children: selectedItems.map((item) => ({
            id: item.id,
            name: item.hostnameLabel,
            icon: <File />,
          })),
        },
      ];
    });
  };

  const handleToggleCurrentItemActive = (itemId, isActive) => {
    setCurrentSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isActive,
            }
          : item
      )
    );
  };

  const buildSavePayload = (itemsToSave) =>
    itemsToSave.map((item) => ({
      id: item.id,
      name: item.name,
      isActive: !!item.isActive,
      children: item.children
        ? item.children.map((child) => ({
            id: child.id,
            name: child.name,
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.conf,.hosts,*/*"
        style={{ display: "none" }}
        onChange={(event) => {
          void handleBrowserFileChange(event);
        }}
      />

      <Header
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSavePress={() => setIsCommitDialogOpen(true)}
        onOpenHostsPress={() => {
          void openHostsFile();
        }}
        onClearPress={clearHostsData}
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

              return [
                ...prev,
                {
                  ...item,
                  isActive: false,
                },
              ];
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
        onConfirm={(selectedItems) => {
          const payload = buildSavePayload(selectedItems);
          console.log("Commit selected items:", payload);
          ToastQueue.positive("Commit completed successfully.", {
            timeout: 5000,
          });
        }}
      />

      <ToastContainer />
    </div>
  );
};

export default MainLayout;
