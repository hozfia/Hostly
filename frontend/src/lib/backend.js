const appBinding = () => window?.go?.main?.App;

export const ApplyHostsPlan = (path, plan) =>
  appBinding().ApplyHostsPlan(path, plan);

export const LoadStoredGroups = () => appBinding().LoadStoredGroups();

export const PreviewHostsSelection = (path, items) =>
  appBinding().PreviewHostsSelection(path, items);

export const SaveStoredGroups = (groups) => appBinding().SaveStoredGroups(groups);

export const SelectHostsFile = () => appBinding().SelectHostsFile();
