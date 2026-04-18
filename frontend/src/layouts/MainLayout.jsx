import React, { useState } from "react";
import { Content, ToastContainer, ToastQueue } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

import Header from "./Header";
import Sidebar from "./Sidebar";
import ContentTable from "../components/ContentTable";
import CommitDialog from "../components/dialogs/CommitDialog";
import Folder from "@react-spectrum/s2/icons/Folder";
import File from "@react-spectrum/s2/icons/File";
import Footer from "./Footer";


const MainLayout = () => {
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const [currentSelectedItems, setCurrentSelectedItems] = useState([]);
    const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
    

    // ✅ THIS is your real data
    const [items, setItems] = useState([
        {
            id: "documents",
            name: "Documents",
            icon: <Folder />,
            children: [],
        },
    ]);

    // ✅ add group OR add to existing group
    const handleConfirmGrouping = ({ selected, groupName }) => {
        setItems((prev) => {
            // check if group exists
            const existing = prev.find((g) => g.name === groupName);

            if (existing) {
                // ✅ add to existing group
                return prev.map((group) =>
                    group.name === groupName
                        ? {
                            ...group,
                            children: [
                                ...group.children,
                                ...selected.map((id) => ({
                                    id: `${id}-${Date.now()}`,
                                    name: id,
                                    icon: <File />,
                                })),
                            ],
                        }
                        : group
                );
            }

            // ✅ create new group
            return [
                ...prev,
                {
                    id: `group-${Date.now()}`,
                    name: groupName || "New Group",
                    icon: <Folder />,
                    children: selected.map((id) => ({
                        id,
                        name: id,
                        icon: <File />,
                    })),
                },
            ];
        });
    };

    return (
        <div
            className={style({
                display: "flex",
                flexDirection: "column",
                height: "100vh",
            })}
        >
            <Header onSavePress={() => setIsCommitDialogOpen(true)} />

            <div className={style({ display: "flex", flex: 1 })}>
            <Sidebar
  items={items}
  currentSelectedItems={currentSelectedItems}
  onAddToCurrent={(item) => {
    setCurrentSelectedItems((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }}
/>
                <ContentTable
                    selected={selectedKeys}
                    setSelected={setSelectedKeys}
                    onConfirmGrouping={handleConfirmGrouping}
                />
            </div>
            <CommitDialog
                isOpen={isCommitDialogOpen}
                onClose={() => setIsCommitDialogOpen(false)}
                selectedKeys={selectedKeys}
                onConfirm={(selected) => {
                    console.log("Commit selected items:", selected);
                    ToastQueue.positive("Commit completed successfully.");
                }}
            />
            <ToastContainer />
            {/* <Footer /> */}
        </div>
    );
};

export default MainLayout;
