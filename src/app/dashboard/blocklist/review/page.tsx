import { getRule, pendingMessages } from "@/lib/blocklist";
import { getMessage } from "@/features/messages/actions/get-message";
import InboxView from "@/features/messages/components/inbox-view";
import type { InboxMessage } from "@/features/messages/types";

type Props = {
  searchParams: Promise<{ rule?: string; mailbox?: string; uid?: string }>;
};

/** What Apply would move — all of it, or one rule's share — before it moves. */
export default async function ReviewPage({ searchParams }: Props) {
  const { rule: rawRule, mailbox, uid } = await searchParams;
  const ruleId = rawRule ? Number(rawRule) : undefined;
  const selected = mailbox && uid ? { mailboxId: mailbox, uid: Number(uid) } : null;

  // A rule id that isn't the user's falls back to nothing, not to everything.
  const rule = ruleId === undefined ? undefined : await getRule(ruleId);
  const rows = ruleId !== undefined && !rule ? [] : await pendingMessages(rule?.id);

  const messages: InboxMessage[] = rows.map((r) => ({
    mailboxId: String(r.mailboxId),
    mailboxEmail: r.mailboxEmail,
    uid: r.uid,
    subject: r.subject ?? "(no subject)",
    from: r.fromAddress ?? "(unknown sender)",
    date: r.date,
  }));

  const message = selected ? await getMessage(selected.mailboxId, selected.uid) : null;
  const base = `/dashboard/blocklist/review?${rule ? `rule=${rule.id}&` : ""}`;

  return (
    <InboxView
      title={rule ? rule.value : "Everything pending"}
      subtitle={`${messages.length} message${messages.length === 1 ? "" : "s"} Apply would move`}
      backHref="/dashboard/blocklist"
      backLabel="← Blocked senders"
      result={{ messages, errors: [] }}
      selected={selected}
      message={message}
      hrefFor={(msg) => `${base}mailbox=${msg.mailboxId}&uid=${msg.uid}`}
      showMailbox
    />
  );
}
