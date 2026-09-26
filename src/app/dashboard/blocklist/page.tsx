import Link from "next/link";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import { listRules, pendingCount } from "@/lib/blocklist";
import { unblockSenderAction } from "@/features/filtering/actions/unblock-sender";
import ApplyMoveButton from "@/features/filtering/components/apply-move-button";
import PatternForm from "@/features/filtering/components/pattern-form";

type Props = { searchParams: Promise<{ notice?: string; error?: string }> };

const KIND_LABEL = {
  domain: "whole domain",
  address: "single address",
  pattern: "pattern",
} as const;

export default async function BlocklistPage({ searchParams }: Props) {
  const { notice, error } = await searchParams;
  const rules = await listRules();
  const pending = await pendingCount();

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

      {notice && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="mb-6">
        <PatternForm />
      </Card>

      {rules.length === 0 ? (
        <p className="text-gray-500">
          Nothing blocked yet. Add a pattern above, or use the Block buttons while
          browsing{" "}
          <Link href="/dashboard/filter" className="underline">
            grouped senders
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <ApplyMoveButton pending={pending} />
            {pending > 0 && (
              <Link href="/dashboard/blocklist/review" className="text-sm underline">
                Review all {pending.toLocaleString()}
              </Link>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={
                        r.kind === "pattern"
                          ? "truncate font-mono text-sm font-medium"
                          : "truncate font-medium"
                      }
                    >
                      {r.value}
                    </div>
                    <div className="text-xs text-gray-500">{KIND_LABEL[r.kind]}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="tabular-nums text-gray-500">
                      {r.matches > 0 ? (
                        <Link
                          href={`/dashboard/blocklist/review?rule=${r.id}`}
                          className="underline hover:text-gray-900"
                        >
                          {r.matches} pending
                        </Link>
                      ) : (
                        "0 pending"
                      )}
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
