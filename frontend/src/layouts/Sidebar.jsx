import React from "react";
import { View, Flex } from "@adobe/react-spectrum";
import CurrentSelected from "../components/CurrentSelected"
import Labels from "../components/Labels"

const Sidebar = ({
  items,
  onAddToCurrent,
  currentSelectedItems,
  onToggleCurrentItemActive,
}) => {


  return (
    <View
    UNSAFE_style={{
      width: "30%",
      flexShrink: 0,
      padding:5
    }}
      // width="25%"              // ✅ IMPORTANT (fix layout issues)
      // height="100%"
      // backgroundColor="gray-100"
      // padding="size-200"
    >
      <Flex direction="column" gap="size-150">
      <CurrentSelected
        items={currentSelectedItems}
        onToggleItemActive={onToggleCurrentItemActive}
      />
        <Labels items={items} onAddToCurrent={onAddToCurrent} />
      </Flex>
    </View>
  );
};

export default Sidebar;
