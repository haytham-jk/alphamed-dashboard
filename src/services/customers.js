import { supabase } from "../lib/supabase";

const customerSelection = `
  id,
  customer_name,
  emirate,
  is_active,
  customer_contacts (
    id,
    customer_id,
    name,
    designation,
    phone_number,
    email,
    display_order
  )
`;

export async function getCustomerOptions() {
  const { data, error } = await supabase.from("customers").select("id, customer_name, emirate, is_active").eq("is_active", true).order("customer_name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.customer_name, emirate: row.emirate ?? "Unknown" }));
}

export async function getCustomers() {
  const { data, error } = await supabase.from("customers").select(customerSelection).order("customer_name").order("display_order", { referencedTable: "customer_contacts", ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(customerId) {
  const { data, error } = await supabase.from("customers").select(customerSelection).eq("id", Number(customerId)).single();
  if (error) throw error;
  return data;
}

export async function saveCustomerWithContacts(customerId, values) {
  const contacts = (values.contacts ?? []).map((contact, index) => ({
    name: String(contact.name ?? "").trim(),
    designation: contact.designation,
    phoneNumber: String(contact.phoneNumber ?? "").trim() || null,
    email: String(contact.email ?? "").trim() || null,
    displayOrder: index,
  }));
  const { data, error } = await supabase.rpc("save_customer_with_contacts", {
    p_customer_id: customerId ? Number(customerId) : null,
    p_customer_name: values.customerName.trim(),
    p_emirate: values.emirate || null,
    p_is_active: values.isActive,
    p_contacts: contacts,
  });
  if (error) throw error;
  return { id: Number(data) };
}

export async function createCustomer(values) { return saveCustomerWithContacts(null, values); }
export async function updateCustomer(customerId, values) { return saveCustomerWithContacts(customerId, values); }
