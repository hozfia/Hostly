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

import Interaction from "@react-spectrum/s2/icons/Interaction";
import Tag from "@react-spectrum/s2/icons/Tag";
import Edit from "@react-spectrum/s2/icons/Edit";

import { style } from "@react-spectrum/s2/style" with { type: "macro" };

import GroupingDialog from "./dialogs/GroupingDialog";

const ContentTable = ({ selected, setSelected, onConfirmGrouping }) => {
  const [groupingOpen, setGroupingOpen] = useState(false);

  return (
    <>
      <TableView
        aria-label="Favorite pokemon"
        styles={style({
          width: "100%",
          height: "100%",
          flex: 1,
          minWidth: 0,
        })}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
        onAction={(key) => alert(`Clicked ${key}`)}
        renderActionBar={(selectedKeys) => {
          const selection =
            selectedKeys === "all"
              ? "all"
              : [...selectedKeys].join(", ");

          return (
            <ActionBar>
              <ActionButton onPress={() => alert(`Activate ${selection}`)}>
                <Interaction />
                <Text>Activate</Text>
              </ActionButton>

              <ActionButton onPress={() => setGroupingOpen(true)}>
                <Tag />
                <Text>Grouping</Text>
              </ActionButton>

              <ActionButton onPress={() => alert(`Edit ${selection}`)}>
                <Edit />
                <Text>Edit</Text>
              </ActionButton>
            </ActionBar>
          );
        }}
      >
        <TableHeader>
          <Column isRowHeader>Name</Column>
          <Column>Type</Column>
          <Column>Level</Column>
        </TableHeader>

        <TableBody>
          <Row id="charizard">
            <Cell>Charizard</Cell>
            <Cell>Fire, Flying</Cell>
            <Cell>67</Cell>
          </Row>

          <Row id="blastoise">
            <Cell>Blastoise</Cell>
            <Cell>Water</Cell>
            <Cell>56</Cell>
          </Row>

          <Row id="venusaur" isDisabled>
            <Cell>Venusaur</Cell>
            <Cell>Grass, Poison</Cell>
            <Cell>83</Cell>
          </Row>

          <Row id="pikachu">
            <Cell>Pikachu</Cell>
            <Cell>Electric</Cell>
            <Cell>100</Cell>
          </Row>
        </TableBody>
      </TableView>

      <GroupingDialog
        isOpen={groupingOpen}
        onClose={() => setGroupingOpen(false)}
        selectedKeys={selected}
        onConfirm={onConfirmGrouping}
      />
    </>
  );
};

export default ContentTable;