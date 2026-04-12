import React, { useState } from "react";
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
  if (!isOpen) return null;

  const { contains } = useFilter({ sensitivity: "base" });
  const selectedArray =
    selectedKeys === "all" ? ["ALL"] : [...selectedKeys];

  const [groupName, setGroupName] = useState("");

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
              onChange={setGroupName}
            />

            <MenuTrigger>
              <ActionButton>
                Add to existing group...
              </ActionButton>

              <Popover aria-label="Select a tag">
                <Autocomplete filter={contains}>
                  <SearchField aria-label="Search tags" autoFocus />

                  <Menu styles={style({ marginTop: 8 })}>
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
          </Form>
        </Content>

        <ButtonGroup>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>

          <Button
            variant="accent"
            onPress={() => {
              onConfirm({
                selected: selectedArray,
                groupName,
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