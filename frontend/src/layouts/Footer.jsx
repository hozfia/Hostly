// Footer.jsx
import React from "react";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };

const Footer = () => {
  return (
    <footer
    className={style({
        padding: 16,
        borderTop: "1px solid gray",
        textAlign: "center",
      })}
    >
      © 2026 My App
    </footer>
  );
};

export default Footer;