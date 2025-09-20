import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
// --- Global early error banner (shows even before React mounts)
(function setupGlobalErrorBanner() {
  if (typeof window === "undefined") return;
  function show(msg: string) {
    const el = document.createElement("pre");
    el.style.cssText = [
      "position:fixed", "z-index:99999", "top:0", "left:0", "right:0",
      "max-height:40vh", "overflow:auto",
      "background:#2b0000", "color:#ffb3b3", "padding:12px",
      "font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      "white-space:pre-wrap", "margin:0"
    ].join(";");
    el.textContent = msg;
    document.body.prepend(el);
  }
  window.addEventListener("error", (e) => show(String(e.error?.stack || e.message || e)));
  window.addEventListener("unhandledrejection", (e) => show(String((e.reason?.stack || e.reason || e))));
})();
