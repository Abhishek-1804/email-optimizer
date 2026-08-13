import Link from "next/link";
import { cn } from "@/utils/cn";
import type { InboxMessage } from "../types";

type Props = {
  messages: InboxMessage[];
  accountId: number;
  selectedUid: number | null;
};

export default function MessageList({ messages, accountId, selectedUid }: Props) {
  if (messages.length === 0) {
    return <p className="text-sm text-gray-500">Inbox is empty.</p>;
  }

  return (
    // min-h-0 is required: a grid/flex child defaults to min-height:auto and
    // refuses to shrink, which silently defeats overflow-y-auto.
    <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      {messages.map((msg) => (
        <li key={msg.uid}>
          <Link
            href={`/dashboard/${accountId}?uid=${msg.uid}`}
            scroll={false}
            className={cn(
              "block rounded-lg border p-3 transition-colors",
              selectedUid === msg.uid
                ? "border-gray-900 bg-gray-100"
                : "border-gray-200 hover:bg-gray-50"
            )}
          >
            <div className="truncate text-sm font-medium">{msg.subject}</div>
            <div className="truncate text-xs text-gray-500">{msg.from}</div>
            {msg.date && (
              <div className="mt-1 text-xs text-gray-400">
                {new Date(msg.date).toLocaleString()}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
