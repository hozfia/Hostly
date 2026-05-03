import React, { useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Heading,
  Text,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const isValidIP = (ip) => {
  const t = (ip || "").trim();
  const v4 = t.split(".");
  if (v4.length === 4 && v4.every((n) => /^\d+$/.test(n) && Number(n) <= 255)) {
    return true;
  }
  return t.includes(":") && /^[0-9a-fA-F:]+$/.test(t);
};

const parseBulkLine = (line, lineNum) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const commentIdx = trimmed.indexOf("#");
  const mainPart = commentIdx >= 0 ? trimmed.slice(0, commentIdx).trim() : trimmed;
  const comment = commentIdx >= 0 ? trimmed.slice(commentIdx + 1).trim() : "";

  const parts = mainPart.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { error: `Line ${lineNum}: needs an IP and at least one hostname` };
  }

  const [ip, ...hostnames] = parts;
  if (!isValidIP(ip)) {
    return { error: `Line ${lineNum}: "${ip}" is not a valid IP address` };
  }

  return { ip, hostnames, comment };
};

const emptyState = () => ({
  ip: "",
  hostnamesRaw: "",
  comment: "",
  bulkText: "",
  errors: [],
});

const AddEntryDialog = ({ isOpen, onClose, onAdd }) => {
  const [mode, setMode] = useState("single");
  const [fields, setFields] = useState(emptyState());

  const set = (key) => (value) => setFields((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setMode("single");
    setFields(emptyState());
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleAdd = () => {
    const errors = [];
    let entries = [];

    if (mode === "single") {
      const ip = fields.ip.trim();
      const hostnames = fields.hostnamesRaw.trim().split(/\s+/).filter(Boolean);

      if (!ip) errors.push("IP address is required.");
      else if (!isValidIP(ip)) errors.push(`"${ip}" is not a valid IP address.`);
      if (hostnames.length === 0) errors.push("At least one hostname is required.");

      if (errors.length === 0) {
        entries = [{ ip, hostnames, comment: fields.comment.trim() }];
      }
    } else {
      fields.bulkText.split("\n").forEach((line, i) => {
        const result = parseBulkLine(line, i + 1);
        if (result === null) return;
        if (result.error) errors.push(result.error);
        else entries.push(result);
      });

      if (entries.length === 0 && errors.length === 0) {
        errors.push("No valid entries found. Enter at least one hosts entry.");
      }
    }

    setFields((prev) => ({ ...prev, errors }));
    if (errors.length > 0) return;

    onAdd?.(entries);
    reset();
    onClose?.();
  };

  if (!isOpen) return null;

  const bulkLines = fields.bulkText.split("\n");
  const bulkParsed = bulkLines.map((l, i) => parseBulkLine(l, i + 1)).filter(Boolean);
  const validCount = bulkParsed.filter((r) => !r.error).length;
  const errorCount = bulkParsed.filter((r) => r.error).length;

  return (
    <DialogContainer onDismiss={handleClose}>
      <Dialog size="L">
        <Heading slot="title">Add Host Entry</Heading>

        <Content>
          {/* Mode toggle */}
          <div className={style({ display: "flex", gap: 8, marginBottom: 16 })}>
            <Button
              variant={mode === "single" ? "accent" : "secondary"}
              size="S"
              onPress={() => {
                setMode("single");
                setFields((prev) => ({ ...prev, errors: [] }));
              }}
            >
              Single
            </Button>
            <Button
              variant={mode === "bulk" ? "accent" : "secondary"}
              size="S"
              onPress={() => {
                setMode("bulk");
                setFields((prev) => ({ ...prev, errors: [] }));
              }}
            >
              Bulk
            </Button>
          </div>

          <Divider size="S" styles={style({ marginBottom: 20 })} />

          {mode === "single" ? (
            <div className={style({ display: "flex", flexDirection: "column", gap: 16 })}>
              <TextField
                label="IP Address"
                placeholder="e.g. 127.0.0.1"
                value={fields.ip}
                onChange={set("ip")}
                isRequired
                width="100%"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <TextField
                label="Hostnames"
                description="Space-separated — e.g. mysite.local www.mysite.local"
                placeholder="mysite.local"
                value={fields.hostnamesRaw}
                onChange={set("hostnamesRaw")}
                isRequired
                width="100%"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <TextField
                label="Comment"
                description="Optional"
                placeholder="e.g. development server"
                value={fields.comment}
                onChange={set("comment")}
                width="100%"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className={style({ display: "flex", flexDirection: "column", gap: 12 })}>
              <TextArea
                label="Paste hosts entries"
                description="One entry per line — format: IP hostname [# comment]"
                placeholder={"127.0.0.1 mysite.local\n192.168.1.10 api.local # dev API"}
                value={fields.bulkText}
                onChange={set("bulkText")}
                width="100%"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {fields.bulkText.trim() && (
                <Text
                  UNSAFE_style={{
                    fontSize: "0.9rem",
                    color: errorCount > 0 ? "var(--spectrum-negative-color-900)" : "var(--spectrum-positive-color-900)",
                  }}
                >
                  {validCount} valid {validCount === 1 ? "entry" : "entries"}
                  {errorCount > 0 ? `, ${errorCount} with errors` : ""}
                </Text>
              )}
            </div>
          )}

          {fields.errors.length > 0 && (
            <div className={style({ marginTop: 16 })}>
              {fields.errors.map((err, i) => (
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
          <Button variant="accent" onPress={handleAdd}>
            {mode === "bulk" && validCount > 0 ? `Add (${validCount})` : "Add"}
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
};

export default AddEntryDialog;
