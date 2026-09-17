"use client";

import Script from "next/script";

// AshnaAI embed is public by design (origin-restricted token); safe to inline.
export function AshnaAIWidget() {
  return (
    <Script
      id="ashna-ai-agent-widget"
      src="https://app.ashna.ai/embed/agent-widget.js"
      strategy="lazyOnload"
      data-agent-id="6aac308f94fd2800097d4464"
      data-token="eyJhbGciOiJIUzI1NiJ9.eyJhZ2VudElkIjoiNmFhYzMwOGY5NGZkMjgwMDA5N2Q0NDY0IiwidXNlcklkIjoiNmE3NmU1MzE4NDc2ZmNhM2FhZDUxOGUwIiwiYWxsb3dlZE9yaWdpbnMiOlsibGltcy1zZXZlbl9raGhraS52ZXJjZWwuYXBwIl0sIm9yaWdpbkRvbWFpbiI6ImxpbXMtc2V2ZW4ta2hha2kiLCJhc3NpZ25lZE9yZ0lkIjoiIiwiaWF0IjoxNzg5NjY5NjQ1LCJpc3MiOiJhc2huYUFJIiwiYXVkIjoiYXNobmFJSSIsInN1YiI6IjZhYWMzMDhmOTRmZDI4MDAwOTdkNDQ2NCJ9.HM2Y0pmbZUHt2td-zwRD86-2_Zi5nK_wdLafhd_gqvQ"
      data-icon-color="#0d9488"
      data-icon-shape="circle"
      data-icon-style="help"
    />
  );
}
