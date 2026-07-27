"use client";

import { useState, useTransition } from "react";
import {
  previewInbox,
  viewMessage,
  syncAccount,
  syncAccountBodies,
  getCacheStats,
  type InboxMessage,
  type MessageDetail,
  type CacheStats,
} from "./actions";

export default function PreviewInbox({ accountId }: { accountId: number }) {
  const [listPending, startListTransition] = useTransition();
  const [detailPending, startDetailTransition] = useTransition();
  const [syncPending, startSyncTransition] = useTransition();
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Pass 1: metadata and grouping signals for the whole mailbox. No bodies. */
  function runHeaderSync() {
    setError(null);
    startSyncTransition(async () => {
      try {
        await syncAccount(accountId);
        setStats(await getCacheStats(accountId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  /** Pass 2: body text for one bounded slice of already-synced messages. */
  function runBodySync() {
    setError(null);
    startSyncTransition(async () => {
      try {
        await syncAccountBodies(accountId);
        setStats(await getCacheStats(accountId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function loadInbox() {
    setError(null);
    setDetail(null);
    setSelectedUid(null);
    startListTransition(async () => {
      try {
        setMessages(await previewInbox(accountId));
      } catch (err) {
        setMessages(null);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function openMessage(uid: number) {
    setSelectedUid(uid);
    setError(null);
    startDetailTransition(async () => {
      try {
        setDetail(await viewMessage(accountId, uid));
      } catch (err) {
        setDetail(null);
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadInbox}
          disabled={listPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-60"
        >
          {listPending ? "Connecting..." : messages ? "Refresh inbox" : "Preview inbox"}
        </button>

        <button
          type="button"
          onClick={runHeaderSync}
          disabled={syncPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-60"
        >
          {syncPending ? "Syncing..." : "Sync mailbox"}
        </button>

        {stats && stats.messages > 0 && (
          <button
            type="button"
            onClick={runBodySync}
            disabled={syncPending}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-60"
          >
            Download bodies
          </button>
        )}
      </div>

      {stats && (
        <p className="mt-2 text-xs text-gray-500">
          {stats.messages.toLocaleString()} of {stats.mailboxSize.toLocaleString()} messages cached
          {" · "}
          {stats.withBody.toLocaleString()} with body
          {stats.lastSyncedAt && ` · last synced ${stats.lastSyncedAt}`}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {messages && messages.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Inbox is empty.</p>
      )}

      {messages && messages.length > 0 && (
        // Fixed height so the panes scroll independently rather than the card
        // growing. min-h-0 is required: grid items won't shrink below content
        // without it, which silently defeats overflow-y-auto.
        <div className="mt-3 grid gap-3 md:h-[30rem] md:grid-cols-[minmax(0,320px)_1fr]">
          {/* Message list */}
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1 md:max-h-none md:min-h-0">
            {messages.map((msg) => (
              <li key={msg.uid}>
                <button
                  type="button"
                  onClick={() => openMessage(msg.uid)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUid === msg.uid
                      ? "border-gray-900 bg-gray-100"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="truncate text-sm font-medium">{msg.subject}</div>
                  <div className="truncate text-xs text-gray-500">{msg.from}</div>
                  {msg.date && (
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(msg.date).toLocaleString()}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Reading pane */}
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 md:max-h-none md:min-h-0">
            {detailPending ? (
              <p className="text-sm text-gray-500">Loading message…</p>
            ) : detail ? (
              <article>
                <h3 className="text-base font-semibold">{detail.subject}</h3>
                <div className="mt-1 text-sm text-gray-600">
                  <div>
                    <span className="text-gray-400">From:</span> {detail.from}
                  </div>
                  {detail.to && (
                    <div>
                      <span className="text-gray-400">To:</span> {detail.to}
                    </div>
                  )}
                  {detail.date && (
                    <div className="text-gray-400">
                      {new Date(detail.date).toLocaleString()}
                    </div>
                  )}
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-words border-t border-gray-100 pt-3 font-sans text-sm text-gray-800">
                  {detail.text}
                </pre>
              </article>
            ) : (
              <p className="text-sm text-gray-400">Select a message to read it here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
