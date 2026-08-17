import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/**
 * Starts the Google consent flow.
 *
 * A link to a route handler rather than a server action: it sets an httpOnly
 * state cookie and redirects to Google, which is a GET navigation away from the
 * app, not a mutation. `prefetch={false}` matters — prefetching would burn the
 * state cookie before the click.
 */
export default function ConnectMailbox({ heading = true }: { heading?: boolean }) {
  return (
    <>
      {heading && <h2 className="mb-3 text-lg font-semibold">Connect a mailbox</h2>}
      <p className="mb-3 max-w-md text-sm text-gray-500">
        Google will ask you to approve access, and you can pick any account —
        connect as many as you like. Revoke any of them from your Google account
        at any time.
      </p>
      <Link href="/api/mailboxes/connect" prefetch={false} className={buttonClasses()}>
        Connect a Gmail account
      </Link>
    </>
  );
}
