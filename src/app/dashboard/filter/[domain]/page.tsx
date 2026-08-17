import Link from "next/link";
import Card from "@/components/ui/card";
import JunkScore from "@/features/filtering/components/junk-score";
import { addressGroups } from "@/lib/message-cache";
import { activeRules } from "@/lib/blocklist";
import BlockButton from "@/features/filtering/components/block-button";

type Props = { params: Promise<{ domain: string }> };

/** Level 2: senders within one domain. */
export default async function DomainPage({ params }: Props) {
  const domain = decodeURIComponent((await params).domain);
  const groups = await addressGroups(domain);
  const rules = await activeRules();
  const back = `/dashboard/filter/${encodeURIComponent(domain)}`;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard/filter" className="text-sm text-gray-500 hover:text-gray-900">
        ← All domains
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">{domain}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {groups.length} {groups.length === 1 ? "sender" : "senders"}. Click one to
        review its messages.
      </p>

      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.address}>
            <Card className="flex items-center justify-between gap-3">
              <Link
                href={`${back}/${encodeURIComponent(g.address)}`}
                className="min-w-0 flex-1"
              >
                <div className="truncate font-medium">{g.address}</div>
                <div className="truncate text-xs text-gray-500">
                  {g.name ?? "—"}
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
                  kind="address"
                  value={g.address}
                  back={back}
                  blocked={rules.addresses.has(g.address)}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
