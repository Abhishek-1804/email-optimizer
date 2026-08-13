"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";

export async function removeAccount(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  // Scoped by clerk_user_id, not just id: the id arrives from the browser and
  // is an input, never proof of ownership.
  const id = Number(formData.get("id"));
  db.prepare(`DELETE FROM email_accounts WHERE id = ? AND clerk_user_id = ?`).run(id, userId);

  revalidatePath("/dashboard");
}
