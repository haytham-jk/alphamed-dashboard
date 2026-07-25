import { supabase } from "../lib/supabase";

const overviewColumns = `
  id, customer_id, customer_name, installation_name, primary_id,
  unity_rt_expiry_date, unity_rt_license_status, unity_rt_days_remaining,
  connectivity_type, connectivity_expiry_date, connectivity_license_status,
  connectivity_days_remaining, service_pack, latest_service_pack,
  service_pack_status, admin_username, credential_reference,
  credentials_verified_date, installation_notes, renewal_notes,
  created_at, updated_at
`;

function clean(value) {
  const result = String(value || "").trim();
  return result || null;
}

function payload(values) {
  return {
    customer_id: Number(values.customerId),
    installation_name: clean(values.installationName),
    primary_id: String(values.primaryId || "").trim(),
    unity_rt_expiry_date: values.unityRtExpiryDate || null,
    connectivity_type: values.connectivityType || "None",
    connectivity_expiry_date:
      values.connectivityType === "None"
        ? null
        : values.connectivityExpiryDate || null,
    service_pack: clean(values.servicePack)?.toUpperCase() || null,
    admin_username: clean(values.adminUsername),
    credential_reference: clean(values.credentialReference),
    credentials_verified_date: values.credentialsVerifiedDate || null,
    installation_notes: clean(values.installationNotes),
    renewal_notes: clean(values.renewalNotes),
  };
}

function friendlyError(error) {
  if (error?.code === "23505") {
    return new Error("This Primary ID is already assigned to another Unity Real Time installation.");
  }
  if (error?.code === "23514") {
    return new Error("Check the Primary ID, connectivity selection, and service-pack format.");
  }
  return error;
}

export async function getUnityRtInstallations() {
  const { data, error } = await supabase
    .from("unity_rt_installations_overview")
    .select(overviewColumns)
    .order("unity_rt_expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getUnityRtInstallation(id) {
  const { data, error } = await supabase
    .from("unity_rt_installations")
    .select("*")
    .eq("id", Number(id))
    .single();
  if (error) throw error;
  return data;
}

export async function getLatestUnityRtServicePack() {
  const { data, error } = await supabase
    .from("application_settings")
    .select("setting_value")
    .eq("setting_key", "unity_rt_latest_service_pack")
    .single();
  if (error) throw error;
  return data?.setting_value || "SP11";
}

export async function createUnityRtInstallation(values) {
  const { data, error } = await supabase
    .from("unity_rt_installations")
    .insert(payload(values))
    .select("id")
    .single();
  if (error) throw friendlyError(error);
  return data;
}

export async function updateUnityRtInstallation(id, values) {
  const { error } = await supabase
    .from("unity_rt_installations")
    .update(payload(values))
    .eq("id", Number(id));
  if (error) throw friendlyError(error);
}

export async function deleteUnityRtInstallation(id) {
  const { error } = await supabase
    .from("unity_rt_installations")
    .delete()
    .eq("id", Number(id));
  if (error) throw error;
}
