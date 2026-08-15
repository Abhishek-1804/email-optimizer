import { listMessages } from "@/features/messages/actions/list-messages";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";

type Props = {
  params: Promise<{ mailboxId: string }>;
  searchParams: Promise<{ uid?: string }>;
};

export default async function InboxPage({ params, searchParams }: Props) {
  const { mailboxId } = await params;
  const uid = (await searchParams).uid;
  const selected = uid ? { mailboxId, uid: Number(uid) } : null;

  const result = await listMessages([mailboxId]);
  const message = selected ? await getMessage(mailboxId, selected.uid) : null;

  return (
    <InboxView
      title="Inbox"
      subtitle={result.messages[0]?.mailboxEmail}
      result={result}
      selected={selected}
      message={message}
      hrefFor={(msg) => `/dashboard/${mailboxId}?uid=${msg.uid}`}
    />
  );
}
