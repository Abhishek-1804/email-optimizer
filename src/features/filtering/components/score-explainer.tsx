/** Every weight in the score, and the colour thresholds the badges use. */
const WEIGHTS = [
  { header: "List-Id", points: 3, note: "a real mailing list" },
  { header: "List-Unsubscribe", points: 3, note: "self-declared bulk mail" },
  { header: "List-Unsubscribe-Post", points: 2, note: "one-click unsubscribe" },
  { header: "Feedback-ID", points: 2, note: "campaign tracking by a sending platform" },
  { header: "Precedence: bulk", points: 1, note: "the old-school bulk marker" },
  { header: "Auto-Submitted", points: 1, note: "machine-generated, e.g. a receipt" },
  { header: "In-Reply-To", points: -3, note: "a reply chain — a conversation with a person" },
];

const BANDS = [
  { label: "0–2", tone: "bg-gray-100 text-gray-600", note: "probably a person" },
  { label: "3–5", tone: "bg-amber-100 text-amber-800", note: "likely bulk" },
  { label: "6+", tone: "bg-red-100 text-red-800", note: "almost certainly bulk" },
];

export default function ScoreExplainer() {
  return (
    <details className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
      <summary className="cursor-pointer font-medium text-gray-600">
        How the score works
      </summary>

      <p className="mt-2">
        Bulk senders announce themselves in the headers, because standards
        require it. We read those headers and add up what we find — no guessing
        at subject lines, no reading your mail.
      </p>

      {/* Weight chart: bar length is the weight, direction is the sign. */}
      <ul className="mt-3 flex flex-col gap-1">
        {WEIGHTS.map((w) => (
          <li key={w.header} className="flex items-center gap-2">
            <code className="w-44 shrink-0 truncate rounded bg-gray-100 px-1 text-gray-700">
              {w.header}
            </code>
            <span className="flex w-24 shrink-0 items-center gap-1">
              <span
                aria-hidden
                className={`h-2 rounded-sm ${w.points > 0 ? "bg-amber-400" : "bg-green-500"}`}
                style={{ width: `${Math.abs(w.points) * 16}px` }}
              />
              <span className="tabular-nums">
                {w.points > 0 ? `+${w.points}` : w.points}
              </span>
            </span>
            <span className="truncate">{w.note}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3">
        <span className="font-medium text-gray-600">Worked example.</span> A Udemy
        promotion carries <code className="rounded bg-gray-100 px-1">List-Unsubscribe</code>{" "}
        (+3), <code className="rounded bg-gray-100 px-1">List-Unsubscribe-Post</code>{" "}
        (+2) and <code className="rounded bg-gray-100 px-1">Feedback-ID</code> (+2) —
        a score of <span className="rounded bg-red-100 px-1 text-red-800">7.0</span>.
        A note from a friend has none of them, and usually{" "}
        <code className="rounded bg-gray-100 px-1">In-Reply-To</code> instead, so it
        scores below zero.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {BANDS.map((b) => (
          <span key={b.label} className="flex items-center gap-1">
            <span className={`rounded px-1.5 py-0.5 tabular-nums ${b.tone}`}>{b.label}</span>
            {b.note}
          </span>
        ))}
      </div>

      <p className="mt-3">
        Groups are ordered by <span className="font-medium text-gray-600">how many</span>{" "}
        of their messages score 3 or above — that is, how much blocking one would
        actually clear — rather than by the highest score, so a single junk
        message does not outrank a sender with hundreds.
      </p>
    </details>
  );
}
