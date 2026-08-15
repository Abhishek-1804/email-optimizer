import { listMailboxes } from "@/lib/mailboxes";
import { listMessages } from "@/features/messages/actions/list-messages";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";

type Props = {
  searchParams: Promise<{ account?: string; uid?: string }>;
};

/**
 * Every mailbox in one list.
 *
 * The composition point: the accounts feature supplies the ids, the messages
 * feature reads them, and neither imports the other.
 */
export default async function AllInboxesPage({ searchParams }: Props) {
  const { account, uid } = await searchParams;
  const selected = account && uid ? { accountId: account, uid: Number(uid) } : null;

  const mailboxes = (await listMailboxes()).filter((m) => m.hasMailScope);
  const result = await listMessages(mailboxes.map((m) => m.id));
  const message = selected ? await getMessage(selected.accountId, selected.uid) : null;

  return (
    <InboxView
      title="All inboxes"
      subtitle={`${result.messages.length} messages across ${mailboxes.length} ${
        mailboxes.length === 1 ? "mailbox" : "mailboxes"
      }`}
      result={result}
      selected={selected}
      message={message}
      hrefFor={(msg) => `/dashboard/all?account=${msg.accountId}&uid=${msg.uid}`}
      showAccount
    />
  );
}
