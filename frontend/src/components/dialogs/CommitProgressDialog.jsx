import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DialogContainer,
  Dialog,
  Heading,
  Content,
  ProgressBar,
  Text,
} from "@react-spectrum/s2";

import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const taskListStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 16,
});

const taskItemStyles = style({
  paddingX: 12,
  paddingY: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "gray-300",
  borderRadius: "lg",
  backgroundColor: "gray-25",
});

const taskStatusStyles = style({
  color: {
    default: "neutral",
    status: {
      running: "notice-700",
      done: "positive-700",
    },
  },
});

const taskItemStateStyles = style({
  borderColor: {
    default: "gray-300",
    status: {
      running: "notice-700",
      done: "positive-700",
    },
  },
  backgroundColor: {
    default: "gray-25",
    status: {
      running: "notice-subtle",
      done: "positive-subtle",
    },
  },
});

const taskPools = [
  "Validating selected items",
  "Preparing commit payload",
  "Checking dependencies",
  "Syncing workspace metadata",
  "Uploading change set",
  "Verifying commit integrity",
  "Refreshing local snapshot",
  "Finalizing commit plan",
];

const pickRandomTasks = () => {
  const shuffled = [...taskPools].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
};

const CommitProgressDialog = ({ isOpen, onClose, onComplete }) => {
  const [value, setValue] = useState(0);
  const [tasks, setTasks] = useState(() => pickRandomTasks());
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setValue(0);
      hasCompletedRef.current = false;
      return;
    }

    setTasks(pickRandomTasks());
    setValue(0);
    hasCompletedRef.current = false;

    const totalDuration = 2000;
    const stepMs = 100;
    const increment = 100 / (totalDuration / stepMs);

    const timer = window.setInterval(() => {
      setValue((current) => Math.min(current + increment, 100));
    }, stepMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || value < 100 || hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;

    const doneTimer = window.setTimeout(() => {
      onComplete?.();
      onClose?.();
    }, 150);

    return () => {
      window.clearTimeout(doneTimer);
    };
  }, [isOpen, onClose, onComplete, value]);

  const activeTaskIndex = useMemo(() => {
    if (value >= 100) {
      return tasks.length - 1;
    }

    return Math.min(Math.floor((value / 100) * tasks.length), tasks.length - 1);
  }, [tasks.length, value]);

  if (!isOpen) return null;

  return (
    <DialogContainer onDismiss={onClose}>
      <Dialog>
        <Heading>Committing Changes</Heading>

        <Content>
          <Text>{tasks[activeTaskIndex]}</Text>

          <div className={style({ marginTop: 16 })}>
            <ProgressBar label="Progress" value={value} />
          </div>

          <div className={taskListStyles}>
            {tasks.map((task, index) => {
              let prefix = "Pending";
              let status = "default";

              if (index < activeTaskIndex || value >= 100) {
                prefix = "Done";
                status = "done";
              } else if (index === activeTaskIndex) {
                prefix = "Running";
                status = "running";
              }

              return (
                <div
                  key={task}
                  className={`${taskItemStyles} ${taskItemStateStyles({
                    status,
                  })}`}
                >
                  <Text className={taskStatusStyles({ status })}>
                    {prefix}: {task}
                  </Text>
                </div>
              );
            })}
          </div>
        </Content>
      </Dialog>
    </DialogContainer>
  );
};

export default CommitProgressDialog;
