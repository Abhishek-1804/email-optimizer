import { cn } from "@/utils/cn";

/** The score that orders the lists, shown so the ordering explains itself. */
export default function JunkScore({ score }: { score: number }) {
  const tone =
    score >= 6 ? "bg-red-100 text-red-800"
    : score >= 3 ? "bg-amber-100 text-amber-800"
    : "bg-gray-100 text-gray-600";

  return (
    <span
      title="Higher means more machine-generated: List-Id, List-Unsubscribe, Feedback-ID and friends add; In-Reply-To subtracts."
      className={cn("rounded px-1.5 py-0.5 text-xs tabular-nums", tone)}
    >
      {score.toFixed(1)}
    </span>
  );
}
