import { supabase } from "../lib/supabase";
import { expectedUpdateTimestamp, unityMutationError } from "../utils/assetUnityConcurrency";

const overviewColumns = `
  id, customer_id, customer_name, installation_name, primary_id,
  unity_rt_expiry_date, unity_rt_license_status, unity_rt_days_remaining,
  connectivity_type, connectivity_expiry_date, connectivity_license_status,
  connectivity_days_remaining, service_pack, latest_service_pack,
  service_pack_status, admin_username, credential_reference,
  credentials_verified_date, installation_notes, renewal_notes,
  created_at, updated_at
`;

const installationColumns = `
  id,
  customer_id,
  installation_name,
  primary_id,
  unity_rt_expiry_date,
  connectivity_type,
  connectivity_expiry_date,
  service_pack,
  admin_username,
  credential_reference,
  credentials_verified_date,
  installation_notes,
  renewal_notes,
  created_at,
  updated_at
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
    .select(installationColumns)
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
  const { error } = await supabase.rpc("update_unity_rt_installation_atomic", {
    p_installation_id: Number(id),
    p_values: payload(values),
    p_expected_updated_at: expectedUpdateTimestamp(values.expectedUpdatedAt, "Unity Real Time installation"),
  });
  if (error) throw friendlyError(unityMutationError(error));
}

export async function deleteUnityRtInstallation(id) {
  const { error } = await supabase
    .from("unity_rt_installations")
    .delete()
    .eq("id", Number(id));
  if (error) throw error;
}

import { normalizeOptions, normalizePage, normalizeUnityQuery } from "../utils/operationalListQuery";
export async function getUnityRtInstallationsPage(values,{signal}={}) { const q=normalizeUnityQuery(values);const request=supabase.rpc("search_unity_rt_installations",{p_query:q.query||null,p_license_status:q.licenseStatus,p_connectivity:q.connectivity,p_service_pack_status:q.servicePackStatus,p_customer_id:q.customerId||null,p_card_filter:q.cardFilter,p_page:q.page,p_page_size:q.pageSize});if(signal)request.abortSignal(signal);const {data,error}=await request;if(error)throw error;return normalizePage(data,q.page); }
export async function getUnityRtFilterOptions({signal}={}) { const request=supabase.rpc("get_unity_rt_filter_options");if(signal)request.abortSignal(signal);const {data,error}=await request;if(error)throw error;return normalizeOptions(data); }
