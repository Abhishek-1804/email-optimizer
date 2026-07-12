"use client";

import { useState, useTransition } from "react";
import { previewInbox, type InboxMessage } from "./actions";

export default function PreviewInbox({ accountId }: { accountId: number }) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePreview() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewInbox(accountId);
        setMessages(result);
      } catch (err) {
        setMessages(null);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        type="button"
        onClick={handlePreview}
        disabled={isPending}
        style={{
          border: "none",
          background: "none",
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 0.8,
          fontSize: "0.85rem",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {isPending ? "Connecting..." : "Preview inbox"}
      </button>

      {error && <p style={{ color: "#e5484d", fontSize: "0.85rem", marginTop: "0.4rem" }}>{error}</p>}

      {messages && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {messages.length === 0 ? (
            <li style={{ fontSize: "0.85rem", opacity: 0.6 }}>Inbox is empty.</li>
          ) : (
            messages.map((msg) => (
              <li key={msg.uid} style={{ fontSize: "0.85rem", borderLeft: "2px solid #ccc6", paddingLeft: "0.5rem" }}>
                <div style={{ fontWeight: 500 }}>{msg.subject}</div>
                <div style={{ opacity: 0.65 }}>
                  {msg.from}
                  {msg.date ? ` · ${new Date(msg.date).toLocaleString()}` : ""}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
