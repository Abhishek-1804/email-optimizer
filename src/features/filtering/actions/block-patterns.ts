"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { blockPatterns } from "@/lib/blocklist";

/**
 * Adds pasted patterns, one per line. Validation errors come back as a banner
 * rather than an error page — a typo in a regex is not a crash.
 */
export async function blockPatternsAction(formData: FormData) {
  let added: number;

  try {
    added = await blockPatterns(String(formData.get("patterns") ?? ""));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add those patterns.";
    redirect(`/dashboard/blocklist?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/", "layout");
  const notice =
    added === 0 ? "No patterns entered." : `Added ${added} pattern${added === 1 ? "" : "s"}.`;
  redirect(`/dashboard/blocklist?notice=${encodeURIComponent(notice)}`);
}
