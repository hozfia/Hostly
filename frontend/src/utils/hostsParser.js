function isValidIPv4(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function isLikelyIPv6(ip) {
  if (!ip.includes(":")) {
    return false;
  }

  return /^[0-9a-fA-F:.]+$/.test(ip);
}

function isValidIP(ip) {
  return isValidIPv4(ip) || isLikelyIPv6(ip);
}

function parseHostsLine(rawLine, lineNumber) {
  const trimmed = rawLine.trim();
  if (!trimmed) {
    return null;
  }

  let disabled = false;
  let lineToParse = trimmed;

  if (lineToParse.startsWith("#")) {
    disabled = true;
    lineToParse = lineToParse.slice(1).trim();
    if (!lineToParse) {
      return null;
    }
  }

  let comment = "";
  const commentIndex = lineToParse.indexOf("#");
  if (commentIndex >= 0) {
    comment = lineToParse.slice(commentIndex + 1).trim();
    lineToParse = lineToParse.slice(0, commentIndex).trim();
  }

  if (!lineToParse) {
    return null;
  }

  const fields = lineToParse.split(/\s+/).filter(Boolean);
  if (fields.length < 2) {
    if (disabled) {
      return null;
    }

    throw new Error(`Invalid hosts entry on line ${lineNumber}: ${rawLine}`);
  }

  const ip = fields[0];
  if (!isValidIP(ip)) {
    if (disabled) {
      return null;
    }

    throw new Error(`Invalid IP address on line ${lineNumber}: ${ip}`);
  }

  return {
    line: lineNumber,
    raw: rawLine,
    ip,
    hostnames: fields.slice(1),
    comment,
    disabled,
  };
}

export function parseHostsContent(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];

  lines.forEach((line, index) => {
    const entry = parseHostsLine(line, index + 1);
    if (entry) {
      entries.push(entry);
    }
  });

  return {
    entries,
  };
}
