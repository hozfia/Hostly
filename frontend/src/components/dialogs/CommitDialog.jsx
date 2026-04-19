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
  borderRadius: "lg",
});

const itemToneStyles = style({
  borderColor: {
    default: "gray-300",
    tone: {
      activate: "positive-700",
      deactivate: "notice-700",
      ignore: "gray-400",
      reject: "negative-700",
    },
  },
  backgroundColor: {
    default: "gray-25",
    tone: {
      activate: "positive-subtle",
      deactivate: "notice-subtle",
      ignore: "gray-100",
      reject: "negative-subtle",
    },
  },
});

const actionLabelStyles = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "full",
  paddingX: 8,
  paddingY: 2,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: {
    default: "gray-300",
    tone: {
      activate: "positive-700",
      deactivate: "notice-700",
      ignore: "gray-400",
      reject: "negative-700",
    },
  },
  backgroundColor: {
    default: "gray-100",
    tone: {
      activate: "positive-subtle",
      deactivate: "notice-subtle",
      ignore: "gray-200",
      reject: "negative-subtle",
    },
  },
  color: {
    default: "neutral",
    tone: {
      activate: "positive-700",
      deactivate: "notice-700",
      ignore: "neutral",
      reject: "negative-700",
    },
  },
});

const CommitDialog = ({
  isOpen,
  onClose,
  reviewItems = [],
  plan = null,
  onConfirm,
  title = "Commit Changes",
  description = "Review the planned hosts file changes before continuing.",
}) => {
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const actionableCount =
    (plan?.activate?.length || 0) + (plan?.deactivate?.length || 0);
  const reviewLabel = reviewItems.length === 1 ? "Review item" : "Review items";

  const toneForAction = (action) => {
    switch (action) {
      case "ACTIVATE":
        return "activate";
      case "DEACTIVATE":
        return "deactivate";
      case "IGNORE":
        return "ignore";
      case "REJECT":
        return "reject";
      default:
        return undefined;
    }
  };

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
          onConfirm?.();
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
                {reviewLabel}: {reviewItems.length}
              </Text>

              <Text
                UNSAFE_style={{
                  display: "block",
                  marginTop: 8,
                  color: "gray",
                }}
              >
                Changes to apply: {actionableCount}
              </Text>

              <Divider size="S" styles={style({ marginY: 16 })} />

              {reviewItems.length > 0 ? (
                <div className={listStyles}>
                  {reviewItems.map((item, index) => (
                    <div
                      key={`${item.action}-${item.line}-${index}`}
                      className={`${itemStyles} ${itemToneStyles({
                        tone: toneForAction(item.action),
                      })}`}
                    >
                      <div className={style({ display: "flex", alignItems: "center", gap: 8 })}>
                        <span
                          className={actionLabelStyles({
                            tone: toneForAction(item.action),
                          })}
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 700,
                          }}
                        >
                          {item.action}
                        </span>
                        <Text>{item.line ? `Line ${item.line}` : "No line"}</Text>
                      </div>
                      <Text
                        UNSAFE_style={{
                          display: "block",
                          fontSize: "0.9rem",
                          color: "gray",
                          marginTop: 4,
                        }}
                      >
                        IP: {item.ip || "-"}
                      </Text>
                      <Text
                        UNSAFE_style={{
                          display: "block",
                          fontSize: "0.9rem",
                          color: "gray",
                          marginTop: 4,
                        }}
                      >
                        Hosts: {item.hosts?.length ? item.hosts.join(", ") : "-"}
                      </Text>
                      <Text
                        UNSAFE_style={{
                          display: "block",
                          fontSize: "0.9rem",
                          color: "gray",
                          marginTop: 4,
                        }}
                      >
                        Reason: {item.reason || "-"}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text>No planned changes are available.</Text>
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
                isDisabled={actionableCount === 0}
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
