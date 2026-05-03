import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ActionButton,
  ActionMenu,
  Breadcrumb,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
  IllustratedMessage,
  ListView,
  ListViewItem,
  MenuItem,
  Text,
  TextField,
} from "@react-spectrum/s2";
import FolderOpen from "@react-spectrum/s2/illustrations/linear/FolderOpen";
import NoSearchResults from "@react-spectrum/s2/illustrations/linear/NoSearchResults";
import Tag from "@react-spectrum/s2/illustrations/linear/Tag";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import File from "@react-spectrum/s2/icons/File";
import Folder from "@react-spectrum/s2/icons/Folder";
import Rename from "@react-spectrum/s2/icons/Rename";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { removeEntryFromGroup, removeGroup, renameGroup, setItems } from "../store/groupsSlice";
import { persistGroupsThunk } from "../store/thunks";

const Labels = ({ items, onAddToCurrent }) => {
  const dispatch = useDispatch();
  const allItems = useSelector((state) => state.groups.items);
  const searchValue = useSelector((state) => state.ui.searchValue);

  const [breadcrumbs, setBreadcrumbs] = useState([
    { id: "root", name: "Root", children: items || [] },
  ]);

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    setBreadcrumbs((prev) =>
      prev
        .map((crumb, index) => {
          if (index === 0) return { id: "root", name: "Root", children: items || [] };
          const updated = (items || []).find((g) => g.id === crumb.id);
          return updated ?? crumb;
        })
        .filter((crumb, index) => index === 0 || (items || []).some((g) => g.id === crumb.id))
    );
  }, [items]);

  const current = breadcrumbs[breadcrumbs.length - 1];

  const onAction = (key) => {
    const item = current.children.find((i) => i.id === key);
    if (item?.children) {
      setBreadcrumbs((prev) => [...prev, item]);
    }
  };

  const handleMenuAction = (action, item) => {
    if (action === "rename") {
      setRenameTarget(item);
      setRenameValue(item.name);
    } else if (action === "remove") {
      dispatch(removeGroup(item.id));
      dispatch(persistGroupsThunk(allItems.filter((g) => g.id !== item.id)));
    }
  };

  const handleEntryRemove = (entry) => {
    const parentGroupId = current.id;
    dispatch(removeEntryFromGroup({ groupId: parentGroupId, entryId: entry.id }));
    const updated = allItems.map((g) =>
      g.id === parentGroupId
        ? { ...g, children: g.children.filter((c) => c.id !== entry.id) }
        : g
    );
    dispatch(persistGroupsThunk(updated));
  };

  const handleRenameConfirm = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renameTarget) return;
    dispatch(renameGroup({ groupId: renameTarget.id, newName: trimmed }));
    const updated = allItems.map((g) =>
      g.id === renameTarget.id ? { ...g, name: trimmed } : g
    );
    dispatch(persistGroupsThunk(updated));
    setRenameTarget(null);
    setRenameValue("");
  };

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
      <Breadcrumbs
        onAction={(key) => {
          const index = breadcrumbs.findIndex((b) => b.id === key);
          setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        }}
      >
        {breadcrumbs.map((b) => (
          <Breadcrumb key={b.id} id={b.id}>
            {b.name}
          </Breadcrumb>
        ))}
      </Breadcrumbs>

      <ListView
        items={current.children}
        onAction={onAction}
        styles={style({ height: 320 })}
        renderEmptyState={() => {
          const isSearching = searchValue.trim().length > 0;
          if (isSearching) {
            return (
              <IllustratedMessage>
                <NoSearchResults />
                <Heading>No matches</Heading>
                <Content>
                  No groups match "{searchValue.trim()}". Try a different search term.
                </Content>
              </IllustratedMessage>
            );
          }
          return (
            <IllustratedMessage>
              {current.id === "root" ? <Tag /> : <FolderOpen />}
              <Heading>
                {current.id === "root" ? "No groups yet" : "Empty group"}
              </Heading>
              <Content>
                {current.id === "root"
                  ? "Select entries from the table, then use the Grouping action to organize them together."
                  : "Use the table to select entries and add them to this group."}
              </Content>
            </IllustratedMessage>
          );
        }}
      >
        {(item) => (
          <ListViewItem id={item.id} textValue={item.name}>
            <div className={style({ display: "flex", alignItems: "center", gap: 12, flex: 1 })}>
              <ActionButton
                onPressStart={(e) => { e.continuePropagation = false; }}
                onPress={() => { onAddToCurrent(item); }}
              >
                <Add />
              </ActionButton>
              <div className={style({ display: "flex", alignItems: "center", gap: 4 })}>
                {item.children ? <Folder /> : <File />}
                <Text>{item.name}</Text>
              </div>
            </div>
            {item.children ? (
              <ActionMenu onAction={(action) => handleMenuAction(action, item)}>
                <MenuItem id="rename" textValue="Rename">
                  <Rename />
                  <Text slot="label">Edit name</Text>
                </MenuItem>
                <MenuItem id="remove" textValue="Remove">
                  <Delete />
                  <Text slot="label">Remove group</Text>
                </MenuItem>
              </ActionMenu>
            ) : (
              <ActionMenu onAction={() => handleEntryRemove(item)}>
                <MenuItem id="remove" textValue="Remove">
                  <Delete />
                  <Text slot="label">Remove</Text>
                </MenuItem>
              </ActionMenu>
            )}
          </ListViewItem>
        )}
      </ListView>

      {renameTarget && (
        <DialogContainer onDismiss={() => setRenameTarget(null)}>
          <Dialog size="S">
            <Heading slot="title">Edit group name</Heading>
            <Content>
              <TextField
                label="Group name"
                value={renameValue}
                onChange={setRenameValue}
                width="100%"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={!renameValue.trim()}
                onPress={handleRenameConfirm}
              >
                Save
              </Button>
            </ButtonGroup>
          </Dialog>
        </DialogContainer>
      )}
    </div>
  );
};

export default Labels;
