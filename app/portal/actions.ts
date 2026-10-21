"use server";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

/** Called after a user sets their own password: clears the "must change password" flag on their own account. */
export async function clearPasswordFlag(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  if (user.app_metadata?.must_change_password) {
    const { error } = await adminAuth().updateUserById(user.id, { app_metadata: { must_change_password: false } });
    if (error) return { ok: false };
  }
  return { ok: true };
}
