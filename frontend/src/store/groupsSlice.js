import { createSlice } from "@reduxjs/toolkit";
import { applyCommitThunk, openHostsFileThunk } from "./thunks";

const groupsSlice = createSlice({
  name: "groups",
  initialState: {
    items: [],
  },
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
    },
    removeGroup: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    renameGroup: (state, action) => {
      const { groupId, newName } = action.payload;
      const group = state.items.find((item) => item.id === groupId);
      if (group) group.name = newName;
    },
    removeEntryFromGroup: (state, action) => {
      const { groupId, entryId } = action.payload;
      const group = state.items.find((item) => item.id === groupId);
      if (group) {
        group.children = group.children.filter((child) => child.id !== entryId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(openHostsFileThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.items = action.payload.storedGroupItems;
        }
      })
      .addCase(applyCommitThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.items = action.payload.nextItems;
        }
      });
  },
});

export const { setItems, removeGroup, renameGroup, removeEntryFromGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
