import Link from "next/link";
import Card from "@/components/ui/card";
import { addressGroups } from "@/lib/message-cache";

type Props = { params: Promise<{ domain: string }> };

/** Level 2: senders within one domain. */
export default async function DomainPage({ params }: Props) {
  const domain = decodeURIComponent((await params).domain);
  const groups = await addressGroups(domain);

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
            <Link
              href={`/dashboard/filter/${encodeURIComponent(domain)}/${encodeURIComponent(g.address)}`}
              className="block"
            >
              <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{g.address}</div>
                  <div className="truncate text-xs text-gray-500">
                    {g.name ?? "—"}
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
    </div>
  );
}
