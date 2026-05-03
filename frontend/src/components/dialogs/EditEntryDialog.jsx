import React, { useEffect, useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Heading,
  Text,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const isValidIP = (ip) => {
  const t = (ip || "").trim();
  const v4 = t.split(".");
  if (v4.length === 4 && v4.every((n) => /^\d+$/.test(n) && Number(n) <= 255)) return true;
  return t.includes(":") && /^[0-9a-fA-F:]+$/.test(t);
};

const EditEntryDialog = ({ isOpen, onClose, entry, onEdit }) => {
  const [ip, setIp] = useState("");
  const [hostnamesRaw, setHostnamesRaw] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (isOpen && entry) {
      setIp(entry.ip || "");
      setHostnamesRaw((entry.hostnames || []).join(" "));
      setComment(entry.comment || "");
      setErrors([]);
    }
  }, [isOpen, entry]);

  const handleClose = () => {
    setErrors([]);
    onClose?.();
  };

  const handleSave = () => {
    const errs = [];
    const trimmedIP = ip.trim();
    const hostnames = hostnamesRaw.trim().split(/\s+/).filter(Boolean);

    if (!trimmedIP) errs.push("IP address is required.");
    else if (!isValidIP(trimmedIP)) errs.push(`"${trimmedIP}" is not a valid IP address.`);
    if (hostnames.length === 0) errs.push("At least one hostname is required.");

    setErrors(errs);
    if (errs.length > 0) return;

    onEdit?.({ ip: trimmedIP, hostnames, comment: comment.trim() });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <DialogContainer onDismiss={handleClose}>
      <Dialog size="M">
        <Heading slot="title">Edit Host Entry</Heading>

        <Content>
          <div className={style({ display: "flex", flexDirection: "column", gap: 16 })}>
            <TextField
              label="IP Address"
              value={ip}
              onChange={setIp}
              isRequired
              width="100%"
              autoFocus
            />
            <TextField
              label="Hostnames"
              description="Space-separated — e.g. mysite.local www.mysite.local"
              value={hostnamesRaw}
              onChange={setHostnamesRaw}
              isRequired
              width="100%"
            />
            <TextField
              label="Comment"
              description="Optional"
              value={comment}
              onChange={setComment}
              width="100%"
            />
          </div>

          {errors.length > 0 && (
            <div className={style({ marginTop: 16 })}>
              {errors.map((err, i) => (
                <Text
                  key={i}
                  UNSAFE_style={{
                    display: "block",
                    color: "var(--spectrum-negative-color-900)",
                    fontSize: "0.9rem",
                    marginBottom: 4,
                  }}
                >
                  {err}
                </Text>
              ))}
            </div>
          )}
        </Content>

        <ButtonGroup>
          <Button variant="secondary" onPress={handleClose}>
            Cancel
          </Button>
          <Button variant="accent" onPress={handleSave}>
            Save
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
};

export default EditEntryDialog;
