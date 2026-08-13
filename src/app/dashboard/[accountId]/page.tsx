import { listMessages } from "@/features/messages/actions/list-messages";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";

type Props = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ uid?: string }>;
};

export default async function InboxPage({ params, searchParams }: Props) {
  const accountId = Number((await params).accountId);
  const uid = (await searchParams).uid;
  const selected = uid ? { accountId, uid: Number(uid) } : null;

  const result = await listMessages([accountId]);
  const message = selected ? await getMessage(accountId, selected.uid) : null;

  return (
    <InboxView
      title="Inbox"
      result={result}
      selected={selected}
      message={message}
      hrefFor={(msg) => `/dashboard/${accountId}?uid=${msg.uid}`}
    />
  );
}
