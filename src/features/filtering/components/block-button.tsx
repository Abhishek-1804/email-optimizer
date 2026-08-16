import Button from "@/components/ui/button";
import { blockSenderAction } from "../actions/block-sender";

/** Adds a domain or address to the blocklist. Idempotent, so no pre-check. */
export default function BlockButton({
  kind,
  value,
  back,
  blocked,
}: {
  kind: "domain" | "address";
  value: string;
  back: string;
  blocked: boolean;
}) {
  if (blocked) {
    return (
      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">blocked</span>
    );
  }

  return (
    <form action={blockSenderAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="value" value={value} />
      <input type="hidden" name="back" value={back} />
      <Button type="submit" variant="secondary" size="sm">
        Block
      </Button>
    </form>
  );
}
