"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { unblockSender } from "@/lib/blocklist";

/** Removes a rule. Mail already moved stays moved. */
export async function unblockSenderAction(formData: FormData) {
  await unblockSender(String(formData.get("id") ?? ""));

  revalidatePath("/", "layout");
  redirect("/dashboard/blocklist");
}
