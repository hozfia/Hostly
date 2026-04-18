import React, { useEffect, useState } from "react";
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
import CommitProgressDialog from "./CommitProgressDialog";

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
  items = [],
  onConfirm,
  title = "Commit Changes",
  description = "Review the current sidebar selection before continuing.",
}) => {
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const selectedItems = items;
  const selectionLabel = selectedItems.length === 1 ? "Selected item" : "Selected items";

  useEffect(() => {
    if (!isOpen) {
      setIsProgressOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (isProgressOpen) {
    return (
      <CommitProgressDialog
        isOpen={isProgressOpen}
        onClose={() => {
          setIsProgressOpen(false);
          onClose?.();
        }}
        onComplete={() => {
          onConfirm?.(selectedItems);
        }}
      />
    );
  }

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
                    <div key={item.id} className={itemStyles}>
                      <Text>{item.name}</Text>
                      <Text
                        UNSAFE_style={{
                          display: "block",
                          fontSize: "0.9rem",
                          color: "gray",
                          marginTop: 4,
                        }}
                      >
                        {item.children
                          ? `${item.children.length} items in group`
                          : "Single item"}{" "}
                        - {item.isActive ? "Active" : "Inactive"}
                      </Text>
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
                isDisabled={selectedItems.length === 0}
                onPress={() => {
                  setIsProgressOpen(true);
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
