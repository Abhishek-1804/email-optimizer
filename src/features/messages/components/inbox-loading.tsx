/** Shown while a route waits on IMAP. Mirrors the master-detail layout so the
 *  page doesn't jump when the real content arrives. */
export default function InboxLoading() {
  return (
    <div className="mx-auto flex h-screen max-w-6xl animate-pulse flex-col p-8">
      <div className="mb-4">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-2 h-7 w-48 rounded bg-gray-200" />
      </div>
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,340px)_1fr]">
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="h-16 rounded-lg border border-gray-200 bg-gray-50" />
          ))}
        </ul>
        <div className="rounded-lg border border-gray-200 bg-gray-50" />
      </div>
    </div>
  );
}
