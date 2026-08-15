import Link from "next/link";
import MessageList from "./message-list";
import MessageViewer from "./message-viewer";
import type { InboxMessage, InboxResult, MessageDetail } from "../types";

type Props = {
  title: string;
  subtitle?: string;
  result: InboxResult;
  selected: { mailboxId: string; uid: number } | null;
  message: MessageDetail | null;
  hrefFor: (msg: InboxMessage) => string;
  showMailbox?: boolean;
};

/** The master-detail shell. Both inbox routes are this plus a set of ids. */
export default function InboxView({
  title,
  subtitle,
  result,
  selected,
  message,
  hrefFor,
  showMailbox,
}: Props) {
  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-8">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to mailboxes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </header>

      {result.errors.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          {result.errors.map((err) => (
            <p key={err.mailboxId} className="text-red-700">
              <span className="font-medium">{err.mailboxEmail ?? `#${err.mailboxId}`}</span>{" "}
              — {err.message}
            </p>
          ))}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,340px)_1fr]">
        <MessageList
          messages={result.messages}
          selected={selected}
          hrefFor={hrefFor}
          showMailbox={showMailbox}
        />
        <MessageViewer message={message} />
      </div>
    </div>
  );
}
