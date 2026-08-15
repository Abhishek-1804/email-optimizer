"use server";

import { revalidatePath } from "next/cache";
import { removeMailbox } from "@/lib/mailboxes";

/**
 * Revokes the grant at Google, then deletes the stored token.
 *
 * A plain server action — no reverification, because this touches our own table
 * rather than the Clerk user. The id comes from the browser and is an input,
 * never proof of ownership; removeMailbox scopes the delete by signed-in user.
 */
export async function disconnectMailbox(formData: FormData) {
  await removeMailbox(String(formData.get("id") ?? ""));
  revalidatePath("/dashboard");
}
