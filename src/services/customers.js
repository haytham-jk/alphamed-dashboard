import { supabase } from "../lib/supabase";

export async function getCustomerOptions() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_name, emirate, is_active")
    .eq("is_active", true)
    .order("customer_name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.customer_name,
    emirate: row.emirate ?? "Unknown",
  }));
}

export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_name, emirate, is_active")
    .order("customer_name");

  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_name, emirate, is_active")
    .eq("id", Number(customerId))
    .single();

  if (error) throw error;
  return data;
}

export async function createCustomer(values) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_name: values.customerName.trim(),
      emirate: values.emirate || null,
      is_active: values.isActive,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  customerId,
  values
) {
  const { error } = await supabase
    .from("customers")
    .update({
      customer_name: values.customerName.trim(),
      emirate: values.emirate || null,
      is_active: values.isActive,
    })
    .eq("id", Number(customerId));

  if (error) throw error;
}
