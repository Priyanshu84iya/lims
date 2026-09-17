"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    AgentWidget?: { destroy?: () => void };
  }
}

// Original AshnaAI embed script, preserved exactly. The script appends
// <ashna-agent-widget> to document.body and exposes window.AgentWidget.destroy().
export function AshnaAIWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.ashna.ai/embed/agent-widget.js";
    script.async = true;
    script.setAttribute("data-agent-id", "6aac308f94fd2800097d4464");
    script.setAttribute(
      "data-token",
      "eyJhbGciOiJIUzI1NiJ9.eyJhZ2VudElkIjoiNmFhYzMwOGY5NGZkMjgwMDA5N2Q0NDY0IiwidXNlcklkIjoiNmE3NmU1MzE4NDc2ZmNhM2FhZDUxOGUwIiwiYWxsb3dlZE9yaWdpbnMiOlsibGltcy1zZXZlbl9raGhraS52ZXJjZWwuYXBwIl0sIm9yaWdpbkRvbWFpbiI6ImxpbXMtc2V2ZW4ta2hha2kiLCJhc3NpZ25lZE9yZ0lkIjoiIiwiaWF0IjoxNzg5NjY5NjQ1LCJpc3MiOiJhc2huYUFJIiwiYXVkIjoiYXNobmFJSSIsInN1YiI6IjZhYWMzMDhmOTRmZDI4MDAwOTdkNDQ2NCJ9.HM2Y0pmbZUHt2td-zwRD86-2_Zi5nK_wdLafhd_gqvQ"
    );
    script.setAttribute("data-icon-color", "#0d9488");
    script.setAttribute("data-icon-shape", "circle");
    script.setAttribute("data-icon-style", "help");
    document.body.appendChild(script);

    return () => {
      // AshnaAI's own teardown API removes the widget element from document.body.
      window.AgentWidget?.destroy?.();
      script.remove();
    };
  }, []);

  return null;
}
