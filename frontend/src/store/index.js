import { configureStore } from "@reduxjs/toolkit";
import hostsReducer from "./hostsSlice";
import groupsReducer from "./groupsSlice";
import selectionReducer from "./selectionSlice";
import uiReducer from "./uiSlice";

export const store = configureStore({
  reducer: {
    hosts: hostsReducer,
    groups: groupsReducer,
    selection: selectionReducer,
    ui: uiReducer,
  },
});
