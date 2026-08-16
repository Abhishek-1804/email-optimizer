import Link from "next/link";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import { listRules } from "@/lib/blocklist";
import { unblockSenderAction } from "@/features/filtering/actions/unblock-sender";
import ApplyMoveButton from "@/features/filtering/components/apply-move-button";

type Props = { searchParams: Promise<{ applied?: string; error?: string }> };

export default async function BlocklistPage({ searchParams }: Props) {
  const { applied, error } = await searchParams;
  const rules = await listRules();
  const pending = rules.reduce((n, r) => n + r.matches, 0);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard?feature=spam" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to tools
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Blocked senders</h1>
      <p className="mb-4 text-sm text-gray-500">
        Applying moves matching mail into{" "}
        <code className="rounded bg-gray-100 px-1">email-optimizer-nextjs</code> in
        each mailbox. Nothing is deleted — you can move it back from Gmail.
      </p>

      {applied && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {applied}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {rules.length === 0 ? (
        <p className="text-gray-500">
          Nothing blocked yet. Use the Block buttons while browsing{" "}
          <Link href="/dashboard/filter" className="underline">
            grouped senders
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mb-4">
            <ApplyMoveButton pending={pending} />
          </div>

          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.value}</div>
                    <div className="text-xs text-gray-500">
                      {r.kind === "domain" ? "whole domain" : "single address"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="tabular-nums text-gray-500">
                      {r.matches} pending
                      {r.moved > 0 && ` · ${r.moved} moved`}
                    </span>
                    <form action={unblockSenderAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Unblock
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
