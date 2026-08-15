"use server";

import { revalidatePath } from "next/cache";
import { removeMailbox } from "@/lib/mailboxes";

/** removeMailbox revokes at Google, then deletes — scoped to the signed-in user. */
export async function disconnectMailbox(formData: FormData) {
  await removeMailbox(String(formData.get("id") ?? ""));
  revalidatePath("/dashboard");
}
