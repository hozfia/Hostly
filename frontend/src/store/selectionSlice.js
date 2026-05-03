import { createSlice } from "@reduxjs/toolkit";
import { applyCommitThunk, openHostsFileThunk, previewCommitThunk } from "./thunks";

const selectionSlice = createSlice({
  name: "selection",
  initialState: {
    currentSelectedItems: [],
    commitPreview: null,
    isCommitDialogOpen: false,
  },
  reducers: {
    addToCurrentSelected: (state, action) => {
      action.payload.forEach((item) => {
        const alreadyPresent = state.currentSelectedItems.some(
          (existing) => existing.id === item.id
        );
        if (!alreadyPresent) {
          state.currentSelectedItems.push(item);
        }
      });
    },
    toggleItemActive: (state, action) => {
      const { itemId, isActive } = action.payload;
      const item = state.currentSelectedItems.find((i) => i.id === itemId);
      if (item) {
        item.isActive = isActive;
        item.hasPendingStateChange = true;
      }
    },
    clearCurrentSelected: (state) => {
      state.currentSelectedItems = [];
      state.commitPreview = null;
    },
    closeCommitDialog: (state) => {
      state.isCommitDialogOpen = false;
      state.commitPreview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(openHostsFileThunk.fulfilled, (state) => {
        state.currentSelectedItems = [];
        state.commitPreview = null;
        state.isCommitDialogOpen = false;
      })
      .addCase(previewCommitThunk.fulfilled, (state, action) => {
        state.commitPreview = action.payload;
        state.isCommitDialogOpen = true;
      })
      .addCase(applyCommitThunk.fulfilled, (state) => {
        state.currentSelectedItems = [];
        state.isCommitDialogOpen = false;
        state.commitPreview = null;
      });
  },
});

export const { addToCurrentSelected, clearCurrentSelected, closeCommitDialog, toggleItemActive } =
  selectionSlice.actions;
export default selectionSlice.reducer;
