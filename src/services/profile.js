import { supabase } from "../lib/supabase";

export async function getCurrentProfile(userId) {
  if (!userId) throw new Error("A user ID is required.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
