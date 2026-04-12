import React, { useState } from "react";
import {
  ListView,
  ListViewItem,
  Text,
  Switch,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const CurrentSelected = ({ items = [] }) => {
  const [activeItems, setActiveItems] = useState({});

  return (<ListView
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
        
        {/* Title */}
        <Text>{item.name}</Text>
  
        {/* Description */}
        <Text slot="description">
          {item.children
            ? `${item.children.length} items in group`
            : "Single item"}
        </Text>
  
        {/* 🔥 Switch as trailing content */}
        {/* <Switch
          aria-label={`Toggle ${item.name}`}
          isEmphasized
        //   isSelected={!!activeItems[item.id]}
          onChange={(value) => {
            setActiveItems((prev) => ({
              ...prev,
              [item.id]: value,
            }));
          }}
        /> */}
        
      </ListViewItem>
    )}
  </ListView>
  );
};

export default CurrentSelected;