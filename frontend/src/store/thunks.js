import { createAsyncThunk } from "@reduxjs/toolkit";
import { ToastQueue } from "@react-spectrum/s2";
import {
  ApplyHostsPlan,
  LoadStoredGroups,
  PreviewHostsSelection,
  SaveStoredGroups,
  SelectHostsFile,
} from "../lib/backend";
import {
  buildRowsByLine,
  buildSavePayload,
  buildStoredGroupsPayload,
  mapStoredGroupsToSidebarItems,
  syncItemWithEntries,
} from "../utils/hostsUtils";

export const openHostsFileThunk = createAsyncThunk(
  "hosts/openFile",
  async (_, { rejectWithValue }) => {
    try {
      const result = await SelectHostsFile();

      if (!result || result.cancelled) {
        return null;
      }

      const rowsByLine = buildRowsByLine(result.entries || []);
      let storedGroupItems = [];

      try {
        const storedGroups = await LoadStoredGroups();
        storedGroupItems = mapStoredGroupsToSidebarItems(storedGroups, rowsByLine);
      } catch (error) {
        ToastQueue.negative(
          `Unable to load saved groups from SQLite: ${error?.message || String(error)}`,
          { timeout: 5000 }
        );
      }

      ToastQueue.positive(`Loaded ${result.fileName || "hosts file"} successfully.`, {
        timeout: 5000,
      });

      return {
        entries: result.entries || [],
        filePath: result.path || "",
        fileName: result.fileName || "",
        storedGroupItems,
      };
    } catch (error) {
      const message = error?.message || String(error);
      ToastQueue.negative(message, { timeout: 5000 });
      return rejectWithValue(message);
    }
  }
);

export const previewCommitThunk = createAsyncThunk(
  "selection/previewCommit",
  async (_, { getState, rejectWithValue }) => {
    const { hosts, selection } = getState();

    if (!hosts.filePath) {
      const message = "Open a hosts file from disk before committing changes.";
      ToastQueue.negative(message, { timeout: 5000 });
      return rejectWithValue(message);
    }

    try {
      return await PreviewHostsSelection(
        hosts.filePath,
        buildSavePayload(selection.currentSelectedItems)
      );
    } catch (error) {
      ToastQueue.negative(error?.message || String(error), { timeout: 5000 });
      return rejectWithValue(error?.message || String(error));
    }
  }
);

export const applyCommitThunk = createAsyncThunk(
  "hosts/applyCommit",
  async (_, { getState, rejectWithValue }) => {
    const { hosts, selection, groups } = getState();

    if (!hosts.filePath || !selection.commitPreview?.plan) {
      return rejectWithValue("No file or plan available");
    }

    try {
      const result = await ApplyHostsPlan(hosts.filePath, selection.commitPreview.plan);
      const nextEntries = result.entries || [];
      const nextRowsByLine = buildRowsByLine(nextEntries);

      const nextItems = groups.items.map((item) =>
        syncItemWithEntries(item, nextRowsByLine)
      );
      const nextCurrentSelectedItems = selection.currentSelectedItems.map((item) =>
        syncItemWithEntries(item, nextRowsByLine)
      );

      try {
        await SaveStoredGroups(buildStoredGroupsPayload(nextItems));
      } catch (error) {
        ToastQueue.negative(
          `Unable to save groups to SQLite: ${error?.message || String(error)}`,
          { timeout: 5000 }
        );
      }

      ToastQueue.positive("Commit completed successfully.", { timeout: 5000 });

      return {
        entries: nextEntries,
        filePath: result.path || "",
        fileName: result.fileName || "",
        nextItems,
        nextCurrentSelectedItems,
      };
    } catch (error) {
      ToastQueue.negative(error?.message || String(error), { timeout: 5000 });
      return rejectWithValue(error?.message || String(error));
    }
  }
);

export const persistGroupsThunk = (itemsToStore) => async () => {
  try {
    await SaveStoredGroups(buildStoredGroupsPayload(itemsToStore));
  } catch (error) {
    ToastQueue.negative(
      `Unable to save groups to SQLite: ${error?.message || String(error)}`,
      { timeout: 5000 }
    );
  }
};
