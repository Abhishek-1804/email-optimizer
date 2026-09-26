import Button from "@/components/ui/button";
import { blockPatternsAction } from "../actions/block-patterns";

/**
 * Senders you already know are safe to sweep, typed rather than clicked. Each
 * line is a regular expression searched for in the sender address. Adding one
 * moves nothing — its matches show up as pending until Apply.
 */
export default function PatternForm() {
  return (
    <form action={blockPatternsAction} className="flex flex-col gap-2">
      <label htmlFor="patterns" className="text-sm font-medium">
        Add patterns
      </label>
      <textarea
        id="patterns"
        name="patterns"
        rows={4}
        spellCheck={false}
        placeholder={"@dominos\\.com$\n@postmates\\.com$\n@(mail|email)\\.uber\\.com$"}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-gray-500 focus:outline-none"
      />
      <p className="text-xs text-gray-500">
        One regular expression per line, matched case-insensitively anywhere in the
        sender address — <code className="rounded bg-gray-100 px-1">@dominos</code> also
        matches <code className="rounded bg-gray-100 px-1">x@dominos-deals.biz</code>.
        End with <code className="rounded bg-gray-100 px-1">\.com$</code> to pin the
        domain. Review what each one catches before you Apply.
      </p>
      <div>
        <Button type="submit" variant="secondary" size="sm">
          Add
        </Button>
      </div>
    </form>
  );
}
