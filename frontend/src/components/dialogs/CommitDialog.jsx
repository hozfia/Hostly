import React from "react";
import {
  DialogContainer,
  FullscreenDialog,
  Heading,
  Header,
  Content,
  ButtonGroup,
  Button,
  Text,
  Divider,
} from "@react-spectrum/s2";

import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const listStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 16,
});

const itemStyles = style({
  paddingX: 12,
  paddingY: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  borderRadius: "lg",
  backgroundColor: "gray-25",
});

const CommitDialog = ({
  isOpen,
  onClose,
  selectedKeys,
  onConfirm,
  title = "Commit Changes",
  description = "Review the current selection before continuing.",
}) => {
  if (!isOpen) return null;

  const selectedItems =
    selectedKeys === "all" ? ["ALL"] : [...(selectedKeys || [])];

  const selectionLabel =
    selectedItems.length === 1 ? "Selected item" : "Selected items";

  return (
    <DialogContainer onDismiss={onClose}>
      <FullscreenDialog>
        {({ close }) => (
          <>
            <Heading slot="title">{title}</Heading>
            <Header>{description}</Header>

            <Content>
              <Text>
                {selectionLabel}: {selectedItems.length}
              </Text>

              <Divider size="S" styles={style({ marginY: 16 })} />

              {selectedItems.length > 0 ? (
                <div className={listStyles}>
                  {selectedItems.map((item) => (
                    <div key={item} className={itemStyles}>
                      <Text>{item}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text>No items are currently selected.</Text>
              )}
            </Content>

            <ButtonGroup>
              <Button
                variant="secondary"
                onPress={() => {
                  close();
                }}
              >
                Cancel
              </Button>

              <Button
                variant="accent"
                onPress={() => {
                  onConfirm?.(selectedItems);
                  close();
                }}
              >
                Continue
              </Button>
            </ButtonGroup>
          </>
        )}
      </FullscreenDialog>
    </DialogContainer>
  );
};

export default CommitDialog;
