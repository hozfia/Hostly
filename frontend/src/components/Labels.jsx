import React, { useState, useEffect } from "react";
import {
  Breadcrumbs,
  Breadcrumb,
  ListView,
  ListViewItem,
  Text,ActionButton
} from "@react-spectrum/s2";
import Add from '@react-spectrum/s2/icons/Add';
import File from '@react-spectrum/s2/icons/File';
import Folder from '@react-spectrum/s2/icons/Folder';



import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const Labels = ({ items, onAddToCurrent })=> {
    const [breadcrumbs, setBreadcrumbs] = useState([
        { id: "root", name: "Root", children: items || [] },
      ]);
      
      // ✅ sync when items change
      useEffect(() => {
        setBreadcrumbs([
          { id: "root", name: "Root", children: items || [] },
        ]);
      }, [items]);

  const current = breadcrumbs[breadcrumbs.length - 1];

  const onAction = (key) => {
    const item = current.children.find((i) => i.id === key);

    if (item?.children) {
      setBreadcrumbs((prev) => [...prev, item]);
    }
  };

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
      <Breadcrumbs onAction={(key) => {
        const index = breadcrumbs.findIndex((b) => b.id === key);
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }}>
        {breadcrumbs.map((b) => (
          <Breadcrumb key={b.id} id={b.id}>
            {b.name}
          </Breadcrumb>
        ))}
      </Breadcrumbs>

      <ListView
  items={current.children}
  onAction={onAction}
  styles={style({ height: 320 })}
>
  {(item) => (
    <ListViewItem id={item.id} textValue={item.name}>
      <div className={style({ display: "flex", alignItems: "center", gap: 12, flex: 1 })}>
        <ActionButton
          onPressStart={(e) => { e.continuePropagation = false; }}
          onPress={() => { onAddToCurrent(item); }}
        >
          <Add />
        </ActionButton>
        <div className={style({ display: "flex", alignItems: "center", gap: 4 })}>
          {item.children ? <Folder /> : <File />}
          <Text>{item.name}</Text>
        </div>
      </div>
    </ListViewItem>
  )}
</ListView>
    </div>
  );
};

export default Labels;