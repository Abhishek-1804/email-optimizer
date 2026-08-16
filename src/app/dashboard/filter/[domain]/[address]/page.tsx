import { cachedMessages } from "@/lib/message-cache";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";
import type { InboxMessage } from "@/features/messages/types";

type Props = {
  params: Promise<{ domain: string; address: string }>;
  searchParams: Promise<{ mailbox?: string; uid?: string }>;
};

/** Level 3: every message from one sender — the review step before any action. */
export default async function AddressPage({ params, searchParams }: Props) {
  const { domain, address: rawAddress } = await params;
  const address = decodeURIComponent(rawAddress);
  const { mailbox, uid } = await searchParams;
  const selected = mailbox && uid ? { mailboxId: mailbox, uid: Number(uid) } : null;

  // The list comes from the cache; only an opened body touches IMAP.
  const rows = await cachedMessages(address);
  const messages: InboxMessage[] = rows.map((r) => ({
    mailboxId: String(r.mailboxId),
    mailboxEmail: r.mailboxEmail,
    uid: r.uid,
    subject: r.subject ?? "(no subject)",
    from: r.fromAddress ?? address,
    date: r.date,
  }));

  const message = selected ? await getMessage(selected.mailboxId, selected.uid) : null;
  const base = `/dashboard/filter/${encodeURIComponent(domain)}/${encodeURIComponent(address)}`;

  return (
    <InboxView
      title={address}
      subtitle={`${messages.length} messages`}
      backHref={`/dashboard/filter/${encodeURIComponent(domain)}`}
      backLabel={`← ${decodeURIComponent(domain)}`}
      result={{ messages, errors: [] }}
      selected={selected}
      message={message}
      hrefFor={(msg) => `${base}?mailbox=${msg.mailboxId}&uid=${msg.uid}`}
      showMailbox
    />
  );
}
