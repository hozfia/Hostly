import React, { useState } from "react";
import {
  TableView,
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
  ActionBar,
  ActionButton,
  Text,
} from "@react-spectrum/s2";

import CheckmarkCircle from "@react-spectrum/s2/icons/CheckmarkCircle";
import Tag from "@react-spectrum/s2/icons/Tag";

import { style } from "@react-spectrum/s2/style" with { type: "macro" };

import GroupingDialog from "./dialogs/GroupingDialog";

const ContentTable = ({
  rows,
  selected,
  setSelected,
  onConfirmGrouping,
  onAddSelectedToCurrent,
  existingGroups,
  filePath,
  fileName,
  isLoading,
  errorMessage,
  onOpenHostsFile,
}) => {
  const [groupingOpen, setGroupingOpen] = useState(false);
  const hasRows = rows.length > 0;

  return (
    <>
      <div
        className={style({
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          minWidth: 0,
          flex: 1,
          padding: 16,

          height: "87vh",     // 👈 lock to screen height
          overflow: "hidden",  // 👈 prevent growing
        })}
      >
        {/* Scroll container */}
        <div
          className={style({
            flex: 1,
            minHeight: 0,      // 👈 critical for scroll to work
            overflow: "auto",  // 👈 enables scrolling
          })}
        >
          <TableView
            aria-label="Hosts file entries"
            styles={style({
              width: "100%",
              height: "100%", // fills scroll container
            })}
            selectionMode="multiple"
            selectedKeys={selected}
            onSelectionChange={setSelected}
            renderActionBar={() => (
              <ActionBar>
                <ActionButton
                  onPress={() => {
                    const selectedRows =
                      selected === "all"
                        ? rows
                        : rows.filter((row) => selected?.has?.(row.id));

                    onAddSelectedToCurrent?.(selectedRows);
                  }}
                >
                  <CheckmarkCircle />
                  <Text>Activate/Deactivate</Text>
                </ActionButton>
                <ActionButton onPress={() => setGroupingOpen(true)}>
                  <Tag />
                  <Text>Grouping</Text>
                </ActionButton>
              </ActionBar>
            )}
          >
            <TableHeader>
              <Column isRowHeader>Hostnames</Column>
              <Column>IP Address</Column>
              <Column>Status</Column>
              <Column>Comment</Column>
            </TableHeader>

            <TableBody>
              {hasRows
                ? rows.map((row) => (
                    <Row id={row.id} key={row.id}>
                      <Cell>{row.hostnameLabel}</Cell>
                      <Cell>{row.ip}</Cell>
                      <Cell>{row.disabled ? "Disabled" : "Active"}</Cell>
                      <Cell>{row.comment || "-"}</Cell>
                    </Row>
                  ))
                : null}
            </TableBody>
          </TableView>
        </div>
      </div>

      <GroupingDialog
        isOpen={groupingOpen}
        onClose={() => setGroupingOpen(false)}
        selectedKeys={selected}
        rows={rows}
        onConfirm={onConfirmGrouping}
        existingGroups={existingGroups}
      />
    </>
  );
};

export default ContentTable;
