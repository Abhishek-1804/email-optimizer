import Link from "next/link";
import { cn } from "@/utils/cn";
import type { InboxMessage } from "../types";

type Props = {
  messages: InboxMessage[];
  /** A uid is only unique within one mailbox, so selection needs both halves. */
  selected: { accountId: number; uid: number } | null;
  /** Each view owns its own URL shape; the list just renders what it's given. */
  hrefFor: (msg: InboxMessage) => string;
  /** Only useful when the list mixes mailboxes. */
  showAccount?: boolean;
};

export default function MessageList({ messages, selected, hrefFor, showAccount }: Props) {
  if (messages.length === 0) {
    return <p className="text-sm text-gray-500">Inbox is empty.</p>;
  }

  return (
    // min-h-0 is required: a grid/flex child defaults to min-height:auto and
    // refuses to shrink, which silently defeats overflow-y-auto.
    <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      {messages.map((msg) => {
        const isSelected =
          selected?.accountId === msg.accountId && selected?.uid === msg.uid;

        return (
          <li key={`${msg.accountId}:${msg.uid}`}>
            <Link
              href={hrefFor(msg)}
              scroll={false}
              className={cn(
                "block rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-gray-900 bg-gray-100"
                  : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="truncate text-sm font-medium">{msg.subject}</div>
              <div className="truncate text-xs text-gray-500">{msg.from}</div>

              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                {msg.date && <span>{new Date(msg.date).toLocaleString()}</span>}
                {showAccount && (
                  <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                    {msg.accountEmail}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
