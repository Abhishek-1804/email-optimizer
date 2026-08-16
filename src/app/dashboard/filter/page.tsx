import Link from "next/link";
import Card from "@/components/ui/card";
import { domainGroups } from "@/lib/message-cache";

/** Level 1: one row per sender domain, biggest first. */
export default async function FilterPage() {
  const groups = await domainGroups();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard?feature=spam" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to tools
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Grouped by sender domain</h1>
      <p className="mb-4 text-sm text-gray-500">
        {groups.length} domains across your synced mail. Click one to see its senders.
      </p>

      {groups.length === 0 ? (
        <p className="text-gray-500">Nothing synced yet — sync a mailbox first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.domain}>
              <Link href={`/dashboard/filter/${encodeURIComponent(g.domain)}`} className="block">
                <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-gray-50">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{g.domain}</div>
                    <div className="text-xs text-gray-500">
                      {g.senders} {g.senders === 1 ? "sender" : "senders"}
                      {g.latest && ` · latest ${new Date(g.latest).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    {g.bulk > 0 && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        {g.bulk} bulk
                      </span>
                    )}
                    <span className="font-medium tabular-nums">{g.messages}</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
