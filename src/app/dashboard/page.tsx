import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { buttonClasses } from "@/components/ui/button";
import { listMailboxes } from "@/lib/mailboxes";
import { cacheStats } from "@/lib/message-cache";
import MailboxList from "@/features/mailboxes/components/mailbox-list";
import SpamFilterCard from "@/features/filtering/components/spam-filter-card";
import SpamFilterOptions from "@/features/filtering/components/spam-filter-options";

type Props = {
  searchParams: Promise<{
    connected?: string;
    synced?: string;
    error?: string;
    feature?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { connected, synced, error, feature } = await searchParams;
  const stats = await cacheStats();
  const mailboxes = await listMailboxes();
  const readable = mailboxes.filter((m) => m.hasMailScope);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your mailboxes</h1>
        <UserButton />
      </header>

      {connected && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Connected {connected}.
        </p>
      )}
      {synced && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {synced}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

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
        <h2 className="mb-3 text-lg font-semibold">Connect a mailbox</h2>
        <p className="mb-3 max-w-md text-sm text-gray-500">
          Google will ask you to approve access, and you can pick any account —
          connect as many as you like. Revoke any of them from your Google
          account at any time.
        </p>
        {/* A plain link, not a button: this leaves the app for Google. */}
        <Link href="/api/mailboxes/connect" prefetch={false} className={buttonClasses()}>
          Connect a Gmail account
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Tools</h2>
        <div className="grid items-start gap-3 md:grid-cols-[minmax(0,300px)_1fr]">
          <SpamFilterCard selected={feature === "spam"} stats={stats} />
          {feature === "spam" && <SpamFilterOptions />}
        </div>
      </section>

      <p className="mt-8 max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
        Working with email has destructive implications, so this app never
        deletes anything. A folder named{" "}
        <code className="rounded bg-gray-100 px-1">email-optimizer-nextjs</code>{" "}
        is created in each connected mailbox, and any future &quot;delete&quot;
        will simply move messages there — recoverable from Gmail at any time.
      </p>
    </div>
  );
}
