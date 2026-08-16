import Button from "@/components/ui/button";
import { applyMove } from "../actions/apply-move";

/**
 * Triggers the only write this app performs. Labelled with the exact count so
 * the number is visible before the click, not after.
 */
export default function ApplyMoveButton({ pending }: { pending: number }) {
  return (
    <form action={applyMove}>
      <Button type="submit" disabled={pending === 0}>
        {pending === 0
          ? "Nothing to move"
          : `Apply — move ${pending.toLocaleString()} message${pending === 1 ? "" : "s"}`}
      </Button>
    </form>
  );
}
