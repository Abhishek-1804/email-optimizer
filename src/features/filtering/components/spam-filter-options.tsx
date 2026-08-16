import Link from "next/link";
import Card from "@/components/ui/card";

/** The right-hand panel: how to filter. Levels beyond this are their own routes. */
export default function SpamFilterOptions() {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="font-medium">How do you want to filter?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Nothing is ever deleted here — every path ends at a message list you
          review yourself.
        </p>
      </div>

      <Link
        href="/dashboard/filter"
        className="rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
      >
        <div className="text-sm font-medium">Group by sender</div>
        <p className="mt-0.5 text-xs text-gray-500">
          Categorizes synced mail by the headers bulk senders already use —
          List-Unsubscribe and DKIM domain — then drills down from domain to
          sender to individual messages.
        </p>
      </Link>

      <Link
        href="/dashboard/blocklist"
        className="rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
      >
        <div className="text-sm font-medium">Blocked senders</div>
        <p className="mt-0.5 text-xs text-gray-500">
          The list you build with the Block buttons. Applying moves their mail
          into a folder in your own mailbox, and future syncs skip them.
        </p>
      </Link>
    </Card>
  );
}
