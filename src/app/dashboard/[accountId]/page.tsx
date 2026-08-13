import Link from "next/link";
import { listMessages } from "@/features/messages/actions/list-messages";
import { getMessage } from "@/features/messages/actions/get-message";
import MessageList from "@/features/messages/components/message-list";
import MessageViewer from "@/features/messages/components/message-viewer";

type Props = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ uid?: string }>;
};

export default async function InboxPage({ params, searchParams }: Props) {
  const accountId = Number((await params).accountId);
  const uidParam = (await searchParams).uid;
  const selectedUid = uidParam ? Number(uidParam) : null;

  const messages = await listMessages(accountId);
  const message = selectedUid ? await getMessage(accountId, selectedUid) : null;

  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-8">
      <header className="mb-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to accounts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Inbox</h1>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,340px)_1fr]">
        <MessageList messages={messages} accountId={accountId} selectedUid={selectedUid} />
        <MessageViewer message={message} />
      </div>
    </div>
  );
}
