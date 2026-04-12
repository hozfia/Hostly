import React, { useEffect, useState } from "react";
import {
  DialogContainer,
  Dialog,
  Heading,
  Content,
  ButtonGroup,
  Button,
  Text,
  Form,
  TextField,
  ActionButton,
  Autocomplete,
  MenuTrigger,
  Popover,
  Menu,
  MenuItem,
  SearchField,
} from "@react-spectrum/s2";

import { useFilter } from "react-aria-components";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const GroupingDialog = ({ isOpen, onClose, selectedKeys, onConfirm }) => {
  const { contains } = useFilter({ sensitivity: "base" });
  const selectedArray =
    selectedKeys === "all" ? ["ALL"] : [...(selectedKeys || [])];

  const [groupName, setGroupName] = useState("");
  const [existingGroup, setExistingGroup] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGroupName("");
      setExistingGroup("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedGroupName = groupName.trim();
  const hasNewGroupName = trimmedGroupName.length > 0;
  const hasExistingGroup = existingGroup.length > 0;
  const selectedGroupName = hasExistingGroup ? existingGroup : trimmedGroupName;

  return (
    <DialogContainer onDismiss={onClose}>
      <Dialog>
        <Heading>Grouping</Heading>

        <Content>
          <p>
            You can create a new group or add these hostnames to an existing group.
          </p>

          <Text>
            Selected items: {selectedArray.join(", ")}
          </Text>

          <Form>
            <TextField
              label="Group Name"
              value={groupName}
              isDisabled={hasExistingGroup}
              onChange={(value) => {
                setGroupName(value);
                if (value.trim()) {
                  setExistingGroup("");
                }
              }}
            />

            <MenuTrigger>
              <ActionButton isDisabled={hasNewGroupName}>
                {hasExistingGroup
                  ? `Existing group: ${existingGroup}`
                  : "Add to existing group..."}
              </ActionButton>

              <Popover aria-label="Select a tag">
                <Autocomplete filter={contains}>
                  <SearchField aria-label="Search tags" autoFocus />

                  <Menu
                    styles={style({ marginTop: 8 })}
                    onAction={(key) => {
                      setExistingGroup(String(key));
                      setGroupName("");
                    }}
                  >
                    <MenuItem key="news">News</MenuItem>
                    <MenuItem key="travel">Travel</MenuItem>
                    <MenuItem key="shopping">Shopping</MenuItem>
                    <MenuItem key="business">Business</MenuItem>
                    <MenuItem key="entertainment">Entertainment</MenuItem>
                    <MenuItem key="food">Food</MenuItem>
                    <MenuItem key="technology">Technology</MenuItem>
                    <MenuItem key="health">Health</MenuItem>
                    <MenuItem key="science">Science</MenuItem>
                  </Menu>
                </Autocomplete>
              </Popover>
            </MenuTrigger>

            {hasExistingGroup ? (
              <Text>Adding to existing group: {existingGroup}</Text>
            ) : null}
          </Form>
        </Content>

        <ButtonGroup>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>

          <Button
            variant="accent"
            isDisabled={!selectedGroupName}
            onPress={() => {
              onConfirm({
                selected: selectedArray,
                groupName: selectedGroupName,
              });
              onClose();
            }}
          >
            Confirm
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
};

export default GroupingDialog;
