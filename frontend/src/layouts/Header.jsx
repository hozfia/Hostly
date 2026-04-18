import React from "react";
import { Text, ActionButton, SearchField } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import RocketQuickActions from '@react-spectrum/s2/icons/RocketQuickActions';
import Cancel from '@react-spectrum/s2/icons/Cancel';
import Folder from '@react-spectrum/s2/icons/Folder';

const Header = ({ onSavePress, onOpenHostsPress, onClearPress }) => {
  const [search, setSearch] = React.useState("");

  return (
    <div
      className={style({
        backgroundColor: "gray-100",
        padding: 16,
        borderColor: "gray-200"
      })}>
      <div
        className={style({
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        })}>
        {/* 🏷️ Left: Logo / Title */}
        <Text style={{
          fontSize: "18px",
          fontWeight: "bold"
        }}>
          Hosty
        </Text>

        {/* 🔍 Center: Search */}
        <SearchField
          aria-label="Search"
          placeholder="Search..."
          value={search}
          onChange={setSearch}
          styles={style({
            width: 272
          })}
        />

        <div className={style({
          display: "flex",
          gap: 8
        })}>
          <ActionButton onPress={onOpenHostsPress}>
            <Folder />
            <Text>Open Hosts</Text>
          </ActionButton>
          <ActionButton onPress={onSavePress}>
          <RocketQuickActions />
          <Text>Save</Text>
            </ActionButton>
            <ActionButton onPress={onClearPress}>
          <Cancel />
          <Text>Clear</Text>
            </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default Header;
