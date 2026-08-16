import Link from "next/link";
import Button, { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import { disconnectMailbox } from "../actions/disconnect-mailbox";
import { syncMailbox, syncAllMailboxes } from "../actions/sync-mailbox";
import type { Mailbox } from "@/lib/mailboxes";

export default function MailboxList({ mailboxes }: { mailboxes: Mailbox[] }) {
  if (mailboxes.length === 0) {
    return (
      <p className="text-gray-500">
        No mailboxes connected yet. Connect one below to read it.
      </p>
    );
  }

  const readable = mailboxes.filter((m) => m.hasMailScope);

  return (
    <div className="flex flex-col gap-3">
      {readable.length > 1 && (
        <form action={syncAllMailboxes}>
          <Button type="submit" variant="secondary" size="sm">
            Sync all
          </Button>
        </form>
      )}

      <ul className="flex flex-col gap-3">
        {mailboxes.map((box) => (
          <li key={box.id}>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{box.email}</div>
                <div className="text-sm text-gray-500">
                  {box.provider === "google" ? "Gmail" : box.provider}
                  {!box.hasMailScope && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      no mail access — reconnect
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {box.hasMailScope && (
                  <>
                    <Link
                      href={`/dashboard/${box.id}`}
                      className={buttonClasses("secondary", "sm")}
                    >
                      View inbox
                    </Link>
                    <form action={syncMailbox}>
                      <input type="hidden" name="id" value={box.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Sync
                      </Button>
                    </form>
                  </>
                )}
                <form action={disconnectMailbox}>
                  <input type="hidden" name="id" value={box.id} />
                  <Button type="submit" variant="danger" size="sm">
                    Disconnect
                  </Button>
                </form>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
