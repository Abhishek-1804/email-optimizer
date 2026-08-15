import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { buttonClasses } from "@/components/ui/button";
import { listMailboxes } from "@/features/accounts/actions/list-mailboxes";
import MailboxList from "@/features/accounts/components/mailbox-list";
import ConnectMailbox from "@/features/accounts/components/connect-mailbox";

export default async function DashboardPage() {
  const mailboxes = await listMailboxes();
  const readable = mailboxes.filter((m) => m.hasMailScope);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your mailboxes</h1>
        <UserButton />
      </header>

      <section className="mb-8">
        {readable.length > 1 && (
          <div className="mb-3">
            <Link href="/dashboard/all" className={buttonClasses("primary", "sm")}>
              View all inboxes
            </Link>
          </div>
        )}
        <MailboxList mailboxes={mailboxes} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Add another</h2>
        <p className="mb-3 max-w-md text-sm text-gray-500">
          Google will ask you to approve access. Nothing is stored here — the
          connection lives with your Google account and you can revoke it there
          at any time.
        </p>
        <ConnectMailbox />
      </section>
    </div>
  );
}
