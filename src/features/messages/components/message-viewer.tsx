import type { MessageDetail } from "../types";

export default function MessageViewer({ message }: { message: MessageDetail | null }) {
  if (!message) {
    return (
      <div className="flex min-h-0 items-center justify-center overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400">Select a message to read it here.</p>
      </div>
    );
  }

  return (
    <article className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-base font-semibold">{message.subject}</h3>

      <div className="mt-1 text-sm text-gray-600">
        <div>
          <span className="text-gray-400">From:</span> {message.from}
        </div>
        {message.to && (
          <div>
            <span className="text-gray-400">To:</span> {message.to}
          </div>
        )}
        {message.date && (
          <div className="text-gray-400">{new Date(message.date).toLocaleString()}</div>
        )}
      </div>

      {/* Plain text only, deliberately — see utils/html-to-text.ts. */}
      <pre className="mt-3 border-t border-gray-100 pt-3 font-sans text-sm break-words whitespace-pre-wrap text-gray-800">
        {message.text}
      </pre>
    </article>
  );
}
