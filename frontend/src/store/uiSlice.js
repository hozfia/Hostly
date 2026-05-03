import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    searchValue: "",
    isAddEntryDialogOpen: false,
  },
  reducers: {
    setSearchValue: (state, action) => {
      state.searchValue = action.payload;
    },
    openAddEntryDialog: (state) => {
      state.isAddEntryDialogOpen = true;
    },
    closeAddEntryDialog: (state) => {
      state.isAddEntryDialogOpen = false;
    },
  },
});

export const { setSearchValue, openAddEntryDialog, closeAddEntryDialog } = uiSlice.actions;
export default uiSlice.reducer;
