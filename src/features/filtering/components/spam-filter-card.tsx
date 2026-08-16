import Link from "next/link";
import Card from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { CacheStats } from "@/lib/message-cache";

/** Clicking toggles the options panel open to the right; state lives in the URL. */
export default function SpamFilterCard({
  selected,
  stats,
}: {
  selected: boolean;
  stats: CacheStats;
}) {
  return (
    <Link
      href={selected ? "/dashboard" : "/dashboard?feature=spam"}
      scroll={false}
      className="block"
    >
      <Card
        className={cn(
          "transition-colors",
          selected ? "border-gray-900 bg-gray-100" : "hover:bg-gray-50"
        )}
      >
        <div className="font-medium">Spam filtering</div>
        <p className="mt-1 text-sm text-gray-500">
          {stats.messages > 0
            ? `${stats.bulk.toLocaleString()} of ${stats.messages.toLocaleString()} synced messages look like bulk mail.`
            : "Sync a mailbox to see what can be cleaned up."}
        </p>
      </Card>
    </Link>
  );
}
