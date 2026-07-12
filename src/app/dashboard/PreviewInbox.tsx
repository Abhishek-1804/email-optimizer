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
    <div className="mt-2">
      <button
        type="button"
        onClick={handlePreview}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-60"
      >
        {isPending ? "Connecting..." : "Preview inbox"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {messages && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {messages.length === 0 ? (
            <li className="text-sm text-gray-500">Inbox is empty.</li>
          ) : (
            messages.map((msg) => (
              <li key={msg.uid} className="border-l-2 border-gray-200 pl-2 text-sm">
                <div className="font-medium">{msg.subject}</div>
                <div className="text-gray-500">
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
