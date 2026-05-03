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

export const { setItems } = groupsSlice.actions;
export default groupsSlice.reducer;
