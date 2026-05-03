import React from "react";
import { ListView, ListViewItem, Text, Switch } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const CurrentSelected = ({ items = [], onToggleItemActive }) => {
  return (
    <ListView
      aria-label="Selected Items"
      items={items}
      selectionMode="none"
      styles={style({
        width: "100%",
        height: 320,
      })}
    >
      {(item) => (
        <ListViewItem id={item.id} textValue={item.name}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gridColumn: "1 / -1", padding: "0 16px" }}>
            {/* LEFT SIDE (title + description stacked) */}
            <div
              className={style({
                display: "flex",
                flexDirection: "column",
              })}
            >
              <Text>{item.name}</Text>
              <Text
                UNSAFE_style={{
                  fontSize: "0.85em",
                  color: "gray",
                }}
              >
                {item.children
                  ? `${item.children.length} items in group`
                  : "Single item"}{" "}
                - {item.isActive ? "Active" : "Inactive"}
              </Text>
            </div>

            {/* RIGHT SIDE (switch) */}
            <Switch
              aria-label={`Toggle ${item.name}`}
              isEmphasized
              isSelected={!!item.isActive}
              onChange={(value) => {
                onToggleItemActive?.(item.id, value);
              }}
            />
          </div>
        </ListViewItem>
      )}
    </ListView>
  );
};

export default CurrentSelected;
