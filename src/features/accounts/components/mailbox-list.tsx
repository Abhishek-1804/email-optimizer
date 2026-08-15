import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import { DisconnectMailbox } from "./connect-mailbox";
import type { Mailbox } from "../types";

export default function MailboxList({ mailboxes }: { mailboxes: Mailbox[] }) {
  if (mailboxes.length === 0) {
    return (
      <p className="text-gray-500">
        No mailboxes connected yet. Connect one below to read it.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {mailboxes.map((box) => (
        <li key={box.externalAccountId}>
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
                <Link
                  href={`/dashboard/${box.externalAccountId}`}
                  className={buttonClasses("secondary", "sm")}
                >
                  View inbox
                </Link>
              )}
              <DisconnectMailbox externalAccountId={box.externalAccountId} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
