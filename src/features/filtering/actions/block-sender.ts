"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { blockSender } from "@/lib/blocklist";

/** Adds a domain or address to the blocklist. Idempotent. */
export async function blockSenderAction(formData: FormData) {
  const kind = String(formData.get("kind")) as "domain" | "address";
  await blockSender(kind, String(formData.get("value") ?? ""));

  revalidatePath("/", "layout");
  redirect(String(formData.get("back") ?? "/dashboard/filter"));
}
