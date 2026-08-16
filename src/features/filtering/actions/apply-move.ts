"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { applyBlocklist } from "@/lib/blocklist";
import { imapError } from "@/lib/mailboxes";

/**
 * Moves every cached message matching a block rule into the safety folder.
 *
 * The only action in this app that writes to a mailbox. Nothing is deleted —
 * the mail lands in a folder the user can browse and drag back from.
 */
export async function applyMove() {
  let message: string;

  try {
    const result = await applyBlocklist();
    message =
      result.moved === 0
        ? "Nothing to move — no cached mail matches your rules."
        : `Moved ${result.moved} message${result.moved === 1 ? "" : "s"} from ` +
          `${result.mailboxes} mailbox${result.mailboxes === 1 ? "" : "es"}.`;
  } catch (err) {
    console.error("Apply move failed:", err);
    redirect(`/dashboard/blocklist?error=${encodeURIComponent(imapError(err).message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/dashboard/blocklist?applied=${encodeURIComponent(message)}`);
}
