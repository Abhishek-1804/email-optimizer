import Link from "next/link";
import Card from "@/components/ui/card";
import JunkScore from "@/features/filtering/components/junk-score";
import ScoreExplainer from "@/features/filtering/components/score-explainer";
import { domainGroups } from "@/lib/message-cache";
import { activeRules } from "@/lib/blocklist";
import BlockButton from "@/features/filtering/components/block-button";

/** Level 1: one row per sender domain, biggest first. */
export default async function FilterPage() {
  const groups = await domainGroups();
  const rules = await activeRules();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard?feature=spam" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to tools
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Grouped by sender domain</h1>
      <p className="mb-3 text-sm text-gray-500">
        {groups.length} domains, ordered by how much bulk mail each one sends
        you. Click one to see its senders.
      </p>
      <ScoreExplainer />

      {groups.length === 0 ? (
        <p className="text-gray-500">Nothing synced yet — sync a mailbox first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.domain}>
              <Card className="flex items-center justify-between gap-3">
                <Link
                  href={`/dashboard/filter/${encodeURIComponent(g.domain)}`}
                  className="min-w-0 flex-1"
                >
                  <div className="truncate font-medium">{g.domain}</div>
                  <div className="text-xs text-gray-500">
                    {g.senders} {g.senders === 1 ? "sender" : "senders"}
                    {g.latest && ` · latest ${new Date(g.latest).toLocaleDateString()}`}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  {g.bulk > 0 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      {g.bulk} bulk
                    </span>
                  )}
                  <JunkScore score={g.score} />
                  <span className="font-medium tabular-nums">{g.messages}</span>
                  <BlockButton
                    kind="domain"
                    value={g.domain}
                    back="/dashboard/filter"
                    blocked={rules.domains.has(g.domain)}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
