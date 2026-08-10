import { supabase } from "../lib/supabase";
const customerSelection = `
  id,
  customer_name,
  emirate,
  is_active,
  is_iso_eiac_accredited,
  iso_eiac_accreditation_number,
  is_cap_accredited,
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
export async function findSimilarCustomers(customerName, emirate, excludeCustomerId = null) {
  const { data, error } = await supabase.rpc("find_similar_customers", {
    p_customer_name: String(customerName ?? "").trim(),
    p_emirate: String(emirate ?? "").trim() || null,
    p_exclude_customer_id: excludeCustomerId ? Number(excludeCustomerId) : null,
  });
  if (error) throw error;
  return data ?? [];
}
export async function saveCustomerWithContacts(customerId, values, { allowSimilarOverride = false, similarCandidates = [] } = {}) {
  const contacts = (values.contacts ?? []).map((contact, index) => ({
    name: String(contact.name ?? "").trim(),
    designation: contact.designation,
    phoneNumber: String(contact.phoneNumber ?? "").trim() || null,
    email: String(contact.email ?? "").trim().toLowerCase() || null,
    displayOrder: index,
  }));
  const { data, error } = await supabase.rpc("save_customer_with_contacts", {
    p_customer_id: customerId ? Number(customerId) : null,
    p_customer_name: values.customerName.trim(),
    p_emirate: values.emirate || null,
    p_is_active: values.isActive,
    p_contacts: contacts,
    p_is_iso_eiac_accredited: Boolean(values.isIsoEiacAccredited),
    p_iso_eiac_accreditation_number: values.isIsoEiacAccredited ? String(values.isoEiacAccreditationNumber ?? "").trim() : null,
    p_is_cap_accredited: Boolean(values.isCapAccredited),
    p_allow_similar_override: Boolean(allowSimilarOverride),
    p_similar_candidates: similarCandidates,
  });
  if (error) throw error;
  return { id: Number(data) };
}
export async function createCustomer(values, options) { return saveCustomerWithContacts(null, values, options); }
export async function updateCustomer(customerId, values, options) { return saveCustomerWithContacts(customerId, values, options); }
export async function getCustomerSiteOverview(customerId) {
  const id = Number(customerId);
  const [customerResult, instrumentsResult, unityResult, eqasResult] = await Promise.all([
    supabase.from("customers").select(customerSelection).eq("id", id).single(),
    supabase.from("instruments").select("id, instrument_name, serial_number, installation_date, is_active, notes").eq("customer_id", id).eq("is_active", true).order("instrument_name").order("serial_number"),
    supabase.from("unity_rt_installations_overview").select("id, customer_id, installation_name, primary_id, unity_rt_expiry_date, unity_rt_license_status, connectivity_type, connectivity_expiry_date, connectivity_license_status, service_pack, service_pack_status").eq("customer_id", id).order("installation_name"),
    supabase.from("eqas_online_records_overview").select("id, customer_id, qcnet_id, lab_number, lab_name, created_at, updated_at").eq("customer_id", id).order("lab_number"),
  ]);
  if (customerResult.error) throw customerResult.error;
  if (instrumentsResult.error) throw instrumentsResult.error;
  if (unityResult.error) throw unityResult.error;
  if (eqasResult.error) throw eqasResult.error;
  return {
    customer: customerResult.data,
    instruments: instrumentsResult.data ?? [],
    unity: (unityResult.data ?? []).filter((record) => String(record.primary_id ?? "").trim()),
    eqas: (eqasResult.data ?? []).filter((record) => String(record.lab_number ?? "").trim() || String(record.qcnet_id ?? "").trim()),
  };
}
