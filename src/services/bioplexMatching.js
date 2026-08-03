import { supabase } from "../lib/supabase";

const IMPORT_COLUMNS = "id, original_filename, file_sha256, import_mode, status, workbook_sheet_count, total_row_count, valid_row_count, warning_row_count, conflict_row_count, invalid_row_count, excluded_row_count, notes, created_by, created_at, reviewed_by, reviewed_at, committed_by, committed_at, rolled_back_by, rolled_back_at, rollback_reason";
const ROW_COLUMNS = "id, import_id, sheet_name, source_row_number, section_type, assay_name_raw, assay_name_normalized, material_type, cc_code_raw, product_code_raw, lot_number_raw, lot_number_normalized, release_date_raw, release_date, expiry_date_raw, expiry_date, related_lot_raw, related_lot_normalized, related_material_type, source_values, review_status, proposed_action, issue_codes, review_message, resolution_notes, resolved_by, resolved_at";

async function sha256(file) {
  const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
  return Array.from(new Uint8Array(digest),(byte)=>byte.toString(16).padStart(2,"0")).join("");
}
function rowPayload(importId,row) { return {import_id:importId,sheet_name:row.sheetName,source_row_number:row.sourceRowNumber,section_type:row.sectionType,assay_name_raw:row.assayNameRaw,assay_name_normalized:row.assayNameNormalized,material_type:row.materialType,cc_code_raw:row.ccCodeRaw||null,product_code_raw:row.productCodeRaw||null,lot_number_raw:row.lotNumberRaw||null,lot_number_normalized:row.lotNumberNormalized||null,release_date_raw:row.releaseDateRaw||null,release_date:row.releaseDate||null,expiry_date_raw:row.expiryDateRaw||null,expiry_date:row.expiryDate||null,related_lot_raw:row.relatedLotRaw||null,related_lot_normalized:row.relatedLotNormalized||null,related_material_type:row.relatedMaterialType||null,source_values:row.sourceValues,review_status:row.reviewStatus,proposed_action:row.proposedAction,issue_codes:row.issueCodes,review_message:row.reviewMessage||null}; }

export async function stageBioplexMatchingImport(file,parsed,mode="Replace") {
  const checksum=await sha256(file);
  const {data:existing,error:existingError}=await supabase.from("bioplex_matching_imports").select("id, status, original_filename, committed_at").eq("file_sha256",checksum).eq("status","Committed").maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error(`This exact workbook was already committed as import ${existing.id}.`);
  const {data:created,error}=await supabase.from("bioplex_matching_imports").insert({original_filename:file.name,file_sha256:checksum,import_mode:mode,status:"Review",workbook_sheet_count:parsed.sheetCount}).select(IMPORT_COLUMNS).single();
  if (error) throw error;
  const payload=parsed.rows.map((row)=>rowPayload(created.id,row));
  for (let index=0;index<payload.length;index+=250) { const {error:rowError}=await supabase.from("bioplex_matching_import_rows").insert(payload.slice(index,index+250)); if(rowError) throw rowError; }
  await refreshBioplexImport(created.id);
  return created.id;
}
export async function getBioplexImports(){const {data,error}=await supabase.from("bioplex_matching_imports").select(IMPORT_COLUMNS).order("created_at",{ascending:false});if(error)throw error;return data??[];}
export async function getBioplexImportRows(importId) {
  const pageSize = 1000;
  const allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("bioplex_matching_import_rows")
      .select(ROW_COLUMNS)
      .eq("import_id", Number(importId))
      .order("sheet_name")
      .order("source_row_number")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    allRows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}
export async function updateBioplexImportRow(rowId,changes){const allowed={assay_name_raw:changes.assayName,assay_name_normalized:String(changes.assayName??"").trim().toUpperCase(),lot_number_raw:changes.lotNumber,lot_number_normalized:String(changes.lotNumber??"").trim().toUpperCase(),release_date:changes.releaseDate||null,expiry_date:changes.expiryDate||null,related_lot_raw:changes.relatedLot||null,related_lot_normalized:String(changes.relatedLot??"").trim().toUpperCase()||null,review_status:changes.reviewStatus,proposed_action:changes.proposedAction,resolution_notes:changes.resolutionNotes||null,resolved_at:new Date().toISOString()};const {error}=await supabase.from("bioplex_matching_import_rows").update(allowed).eq("id",Number(rowId));if(error)throw error;}
export async function refreshBioplexImport(importId){const {data,error}=await supabase.rpc("refresh_bioplex_import_counts",{p_import_id:Number(importId)});if(error)throw error;return Number(data);}
export async function commitBioplexImport(importId){const {data,error}=await supabase.rpc("commit_bioplex_matching_import",{p_import_id:Number(importId)});if(error)throw error;return Number(data);}
export async function rollbackBioplexImport(importId,reason){const {data,error}=await supabase.rpc("rollback_bioplex_matching_import",{p_import_id:Number(importId),p_reason:String(reason??"")});if(error)throw error;return Number(data);}
export async function findBioplexMatches(lotNumber,materialType="",includeInactive=false){
  const {data,error}=await supabase.rpc("find_bioplex_matching_lots",{p_lot_number:String(lotNumber??"").trim(),p_material_type:materialType||null,p_include_inactive:Boolean(includeInactive)});
  if(error)throw error;
  const direct=data??[];
  if(!direct.length)return direct;
  const assayIds=[...new Set(direct.map((row)=>row.assay_id).filter(Boolean))];
  const primaryIds=new Set(direct.map((row)=>row.lot_id));
  const relatedIds=new Set(direct.map((row)=>row.related_lot_id).filter(Boolean));
  let query=supabase.from("bioplex_lots").select("id, assay_id, product_id, material_type, lot_number, release_date, expiry_date, is_active, source_import_id, bioplex_products(product_code, product_name)").in("assay_id",assayIds);
  if(!includeInactive)query=query.eq("is_active",true);
  const {data:siblings,error:siblingError}=await query.order("material_type").order("lot_number");
  if(siblingError)throw siblingError;
  const output=[...direct];
  for(const primary of direct.filter((row,index,array)=>array.findIndex((item)=>item.lot_id===row.lot_id)===index)){
    for(const sibling of siblings??[]){
      if(primaryIds.has(sibling.id)||relatedIds.has(sibling.id))continue;
      const include=primary.material_type==="qc"?["kit","calibrator"].includes(sibling.material_type):sibling.material_type==="qc";
      if(!include)continue;
      output.push({...primary,related_lot_id:sibling.id,related_material_type:sibling.material_type,related_lot_number:sibling.lot_number,related_expiry_date:sibling.expiry_date,relationship_type:"assay_related"});
    }
  }
  return output;
}

export async function bulkUpdateBioplexImportRows(rowIds, changes) {
  const ids = [...new Set((rowIds ?? []).map(Number).filter(Number.isFinite))];
  if (!ids.length) throw new Error("Select at least one import row.");
  const payload = {};
  if (changes.reviewStatus) payload.review_status = changes.reviewStatus;
  if (changes.proposedAction) payload.proposed_action = changes.proposedAction;
  if (changes.resolutionNotes !== undefined) payload.resolution_notes = changes.resolutionNotes || null;
  payload.resolved_at = new Date().toISOString();
  const { error } = await supabase
    .from("bioplex_matching_import_rows")
    .update(payload)
    .in("id", ids);
  if (error) throw error;
  return ids;
}

export async function getBioplexImportBlockingRows(importId) {
  const { data, error } = await supabase.rpc("get_bioplex_import_blocking_rows", {
    p_import_id: Number(importId),
  });
  if (error) throw error;
  return data ?? [];
}

export async function correctBioplexLotExpiry(lotId, expiryDate, reason) {
  const { data, error } = await supabase.rpc("correct_bioplex_lot_expiry", {
    p_lot_id: Number(lotId),
    p_expiry_date: expiryDate || null,
    p_reason: String(reason ?? "").trim(),
  });
  if (error) throw error;
  return Number(data);
}

export async function getBioplexLotEvents(lotId) {
  const { data, error } = await supabase
    .from("bioplex_lot_events")
    .select("id, lot_id, event_type, previous_expiry_date, new_expiry_date, reason, performed_by, performed_at")
    .eq("lot_id", Number(lotId))
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
