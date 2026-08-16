"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { listMailboxes, imapError } from "@/lib/mailboxes";
import { syncMailbox as sync } from "@/lib/message-cache";

function done(message: string): never {
  revalidatePath("/", "layout");
  redirect(`/dashboard?synced=${encodeURIComponent(message)}`);
}

function failed(err: unknown): never {
  console.error("Sync failed:", err);
  redirect(`/dashboard?error=${encodeURIComponent(imapError(err).message)}`);
}

export async function syncMailbox(formData: FormData) {
  let message: string;
  try {
    const r = await sync(String(formData.get("id") ?? ""));
    message = `${r.email}: ${r.fetched} new, ${r.total} cached${r.reset ? " (rebuilt)" : ""}`;
  } catch (err) {
    failed(err);
  }
  done(message);
}

export async function syncAllMailboxes() {
  let message: string;
  try {
    const boxes = (await listMailboxes()).filter((m) => m.hasMailScope);
    const results = await Promise.all(boxes.map((m) => sync(m.id)));
    message = results
      .map((r) => `${r.email}: ${r.fetched} new, ${r.total} cached`)
      .join(" · ");
  } catch (err) {
    failed(err);
  }
  done(message || "No mailboxes to sync.");
}
