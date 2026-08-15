import { listMailboxes } from "@/lib/mailboxes";
import { listMessages } from "@/features/messages/actions/list-messages";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";

type Props = {
  searchParams: Promise<{ mailbox?: string; uid?: string }>;
};

/**
 * Every mailbox in one list.
 *
 * The composition point: the mailboxes feature supplies the ids, the messages
 * feature reads them, and neither imports the other.
 */
export default async function AllInboxesPage({ searchParams }: Props) {
  const { mailbox, uid } = await searchParams;
  const selected = mailbox && uid ? { mailboxId: mailbox, uid: Number(uid) } : null;

  const mailboxes = (await listMailboxes()).filter((m) => m.hasMailScope);
  const result = await listMessages(mailboxes.map((m) => m.id));
  const message = selected ? await getMessage(selected.mailboxId, selected.uid) : null;

  return (
    <InboxView
      title="All inboxes"
      subtitle={`${result.messages.length} messages across ${mailboxes.length} ${
        mailboxes.length === 1 ? "mailbox" : "mailboxes"
      }`}
      result={result}
      selected={selected}
      message={message}
      hrefFor={(msg) => `/dashboard/all?mailbox=${msg.mailboxId}&uid=${msg.uid}`}
      showMailbox
    />
  );
}
