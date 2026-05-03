import { createSlice } from "@reduxjs/toolkit";
import { applyCommitThunk, openHostsFileThunk } from "./thunks";

const hostsSlice = createSlice({
  name: "hosts",
  initialState: {
    entries: [],
    filePath: "",
    fileName: "",
    loadError: "",
    isLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(openHostsFileThunk.pending, (state) => {
        state.isLoading = true;
        state.loadError = "";
      })
      .addCase(openHostsFileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.entries = action.payload.entries;
          state.filePath = action.payload.filePath;
          state.fileName = action.payload.fileName;
        }
      })
      .addCase(openHostsFileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.loadError = action.payload || action.error.message || "Failed to load hosts file";
      })
      .addCase(applyCommitThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.entries = action.payload.entries;
          state.filePath = action.payload.filePath;
          state.fileName = action.payload.fileName;
        }
      });
  },
});

export default hostsSlice.reducer;
