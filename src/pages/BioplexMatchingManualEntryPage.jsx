import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import SelectInput from "../components/ui/SelectInput";
import { getBioplexProducts } from "../services/bioplexInventory";
import {
  getActiveBioplexMatchingSnapshot,
  stageBioplexMatchingImport,
} from "../services/bioplexMatching";
import { classifyParsedImportRows } from "../utils/bioplexImportReviewModel";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2";
const emptyCalibrator = () => ({ id: crypto.randomUUID(), mode: "existing", existingKey: "", productId: "", lot: "", releaseDate: "", expiryDate: "" });
const emptyQc = () => ({ id: crypto.randomUUID(), mode: "existing", existingKey: "", productId: "", lot: "", releaseDate: "", expiryDate: "" });
const normalizeLot = (value) => String(value ?? "").trim().toUpperCase();
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function rowBase({ index, assayName, materialType, lot, releaseDate, expiryDate, relatedLot = "", relatedMaterialType = "", productCode = "" }) {
  return {
    sheetName: "Manual Entry",
    sourceRowNumber: index,
    sectionType: materialType === "qc" ? "CONTROLS" : "KITS",
    assayNameRaw: assayName,
    assayNameNormalized: assayName.trim().toUpperCase(),
    materialType,
    ccCodeRaw: productCode || null,
    productCodeRaw: productCode || null,
    lotNumberRaw: lot,
    lotNumberNormalized: normalizeLot(lot),
    releaseDateRaw: releaseDate || null,
    releaseDate: releaseDate || null,
    expiryDateRaw: expiryDate || null,
    expiryDate: expiryDate || null,
    relatedLotRaw: relatedLot || null,
    relatedLotNormalized: normalizeLot(relatedLot) || null,
    relatedMaterialType: relatedMaterialType || null,
    sourceValues: { source: "Manual matching entry" },
    issueCodes: [],
    reviewStatus: "Valid",
    proposedAction: "Create",
    reviewMessage: null,
    inheritedMergedCells: [],
  };
}

function productLabel(product) {
  return [product.bioplex_assays?.assay_name, product.product_name, product.product_code].filter(Boolean).join(" — ");
}

export default function BioplexMatchingManualEntryPage() {
  const navigate = useNavigate();
  const firstInvalidRef = useRef(null);
  const [products, setProducts] = useState({ kit: [], calibrator: [], qc: [] });
  const [snapshot, setSnapshot] = useState({ lots: [], relationships: [] });
  const [kitProductId, setKitProductId] = useState("");
  const [kitLot, setKitLot] = useState("");
  const [kitReleaseDate, setKitReleaseDate] = useState("");
  const [kitExpiryDate, setKitExpiryDate] = useState("");
  const [calibrators, setCalibrators] = useState([emptyCalibrator()]);
  const [qcs, setQcs] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      getBioplexProducts("kit"),
      getBioplexProducts("calibrator"),
      getBioplexProducts("qc"),
      getActiveBioplexMatchingSnapshot(),
    ]).then(([kit, calibrator, qc, active]) => {
      setProducts({ kit, calibrator, qc });
      setSnapshot(active);
    }).catch((loadError) => setError(loadError.message || "Unable to load BioPlex matching options."));
  }, []);

  const kitProduct = products.kit.find((item) => String(item.id) === kitProductId);
  const assayId = kitProduct?.assay_id;
  const assayName = kitProduct?.bioplex_assays?.assay_name ?? "";
  const assayProducts = (type) => products[type].filter((item) => String(item.assay_id) === String(assayId));
  const activeLots = (type) => snapshot.lots.filter((lot) => String(lot.assay_id) === String(assayId) && lot.material_type === type && lot.expiry_date && lot.expiry_date >= localDate());
  const existingLotKey = (lot) => `${lot.id}|${lot.normalized_lot_number}`;

  const preview = useMemo(() => {
    if (!kitProduct || !kitLot.trim()) return null;
    const rows = [];
    let index = 1;
    for (const entry of calibrators) {
      const existing = snapshot.lots.find((lot) => existingLotKey(lot) === entry.existingKey);
      const product = products.calibrator.find((item) => String(item.id) === entry.productId);
      const lot = entry.mode === "existing" ? existing?.normalized_lot_number ?? "" : entry.lot;
      const releaseDate = entry.mode === "existing" ? existing?.release_date ?? "" : entry.releaseDate;
      const expiryDate = entry.mode === "existing" ? existing?.expiry_date ?? "" : entry.expiryDate;
      if (!lot) continue;
      rows.push(rowBase({ index: index++, assayName, materialType: "calibrator", lot, releaseDate, expiryDate, productCode: product?.product_code ?? existing?.cc_code ?? "" }));
      rows.push(rowBase({ index: index++, assayName, materialType: "kit", lot: kitLot, releaseDate: kitReleaseDate, expiryDate: kitExpiryDate, relatedLot: lot, relatedMaterialType: "calibrator", productCode: kitProduct.product_code ?? "" }));
    }
    for (const entry of qcs) {
      const existing = snapshot.lots.find((lot) => existingLotKey(lot) === entry.existingKey);
      const product = products.qc.find((item) => String(item.id) === entry.productId);
      const lot = entry.mode === "existing" ? existing?.normalized_lot_number ?? "" : entry.lot;
      const releaseDate = entry.mode === "existing" ? existing?.release_date ?? "" : entry.releaseDate;
      const expiryDate = entry.mode === "existing" ? existing?.expiry_date ?? "" : entry.expiryDate;
      if (!lot) continue;
      rows.push(rowBase({ index: index++, assayName, materialType: "qc", lot, releaseDate, expiryDate, productCode: product?.product_code ?? existing?.cc_code ?? "" }));
    }
    return classifyParsedImportRows(rows, snapshot, localDate());
  }, [kitProduct, kitLot, kitReleaseDate, kitExpiryDate, calibrators, qcs, products, snapshot, assayName]);

  function patch(listSetter, id, changes) {
    listSetter((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function validate() {
    if (!kitProductId) return "Select a reagent product.";
    if (!kitLot.trim()) return "Enter the reagent lot number.";
    if (!kitExpiryDate) return "Enter the reagent expiry date.";
    if (!calibrators.length) return "Add at least one matching calibrator.";
    for (const item of calibrators) {
      if (item.mode === "existing" && !item.existingKey) return "Select every existing calibrator lot.";
      if (item.mode === "new" && (!item.productId || !item.lot.trim() || !item.expiryDate)) return "Complete every new calibrator product, lot, and expiry date.";
    }
    for (const item of qcs) {
      if (item.mode === "existing" && !item.existingKey) return "Select every existing QC lot.";
      if (item.mode === "new" && (!item.productId || !item.lot.trim() || !item.expiryDate)) return "Complete every new QC product, lot, and expiry date.";
    }
    return "";
  }

  async function continueToReview() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      firstInvalidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalidRef.current?.focus({ preventScroll: true });
      return;
    }
    const blocking = (preview ?? []).filter((row) => ["Invalid", "Conflict", "Possible Duplicate", "Pending"].includes(row.reviewStatus));
    if (blocking.length) {
      setError(`Resolve ${blocking.length} blocking manual entr${blocking.length === 1 ? "y" : "ies"} before continuing.`);
      return;
    }
    try {
      setBusy(true);
      setError("");
      const canonical = JSON.stringify({ assayId, kitProductId, kitLot: normalizeLot(kitLot), kitReleaseDate, kitExpiryDate, calibrators, qcs });
      const file = new File([canonical], `bioplex-manual-entry-${localDate()}.json`, { type: "application/json" });
      const importId = await stageBioplexMatchingImport(file, { sheetCount: 1, rows: preview ?? [] }, "Merge");
      navigate(`/bioplex-matching-imports/${importId}`);
    } catch (stageError) {
      setError(stageError.message || "Unable to stage the manual matching entry.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-6xl space-y-5">
    <Link to="/bioplex-matching-imports" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"><ArrowLeft size={18}/>Back to imports</Link>
    <header><p className="text-sm text-blue-400">BioPlex Matching Imports</p><h1 className="text-3xl font-semibold">Manual matching entry</h1><p className="mt-1 text-slate-400">Add one reagent lot with one or more matching calibrators. Entries still pass through duplicate detection and database review.</p></header>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</div>}
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-xl font-semibold">Reagent kit</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label>Reagent product<SelectInput ref={firstInvalidRef} value={kitProductId} onChange={(event) => { setKitProductId(event.target.value); setCalibrators([emptyCalibrator()]); setQcs([]); }} className={`${inputClass} mt-2`}><option value="">Select reagent product</option>{products.kit.map((product) => <option key={product.id} value={product.id}>{productLabel(product)}</option>)}</SelectInput></label>
        <label>Reagent lot<input value={kitLot} onChange={(event) => setKitLot(event.target.value)} className={`${inputClass} mt-2`} autoComplete="off"/></label>
        <label>Release date, optional<input type="date" value={kitReleaseDate} onChange={(event) => setKitReleaseDate(event.target.value)} className={`${inputClass} mt-2`}/></label>
        <label>Expiry date<input type="date" value={kitExpiryDate} onChange={(event) => setKitExpiryDate(event.target.value)} className={`${inputClass} mt-2`}/></label>
      </div>
    </section>
    <RepeatableSection title="Matching calibrators" items={calibrators} setItems={setCalibrators} add={emptyCalibrator} products={assayProducts("calibrator")} activeLots={activeLots("calibrator")} patch={patch}/>
    <RepeatableSection title="Assay-compatible QC, optional" items={qcs} setItems={setQcs} add={emptyQc} products={assayProducts("qc")} activeLots={activeLots("qc")} patch={patch}/>
    {preview && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">Impact preview</h2><div className="mt-3 grid gap-3 sm:grid-cols-4"><Metric label="Rows" value={preview.length}/><Metric label="New" value={preview.filter((row) => row.proposedAction === "Create").length}/><Metric label="Existing" value={preview.filter((row) => ["Keep Existing", "Skip Duplicate"].includes(row.proposedAction)).length}/><Metric label="Blocking" value={preview.filter((row) => ["Invalid", "Conflict", "Possible Duplicate", "Pending"].includes(row.reviewStatus)).length}/></div></section>}
    <div className="flex justify-end"><button type="button" disabled={busy} onClick={continueToReview} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-medium disabled:opacity-50"><Save size={18}/>Continue to database review</button></div>
  </div>;
}

function RepeatableSection({ title, items, setItems, add, products, activeLots, patch }) {
  return <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2><button type="button" onClick={() => setItems((current) => [...current, add()])} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2"><Plus size={17}/>Add</button></div>
    {items.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between"><strong>Entry {index + 1}</strong><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="rounded-lg border border-red-800 p-2 text-red-300" aria-label={`Remove entry ${index + 1}`}><Trash2 size={16}/></button></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label>Entry mode<SelectInput value={item.mode} onChange={(event) => patch(setItems, item.id, { mode: event.target.value, existingKey: "", productId: "", lot: "", releaseDate: "", expiryDate: "" })} className={`${inputClass} mt-2`}><option value="existing">Select existing active lot</option><option value="new">Add new lot</option></SelectInput></label>
        {item.mode === "existing" ? <label>Existing lot<SelectInput value={item.existingKey} onChange={(event) => patch(setItems, item.id, { existingKey: event.target.value })} className={`${inputClass} mt-2`}><option value="">Select lot</option>{activeLots.map((lot) => <option key={lot.id} value={`${lot.id}|${lot.normalized_lot_number}`}>{lot.normalized_lot_number} | expires {lot.expiry_date}</option>)}</SelectInput></label> : <>
          <label>Product<SelectInput value={item.productId} onChange={(event) => patch(setItems, item.id, { productId: event.target.value })} className={`${inputClass} mt-2`}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{productLabel(product)}</option>)}</SelectInput></label>
          <label>Lot number<input value={item.lot} onChange={(event) => patch(setItems, item.id, { lot: event.target.value })} className={`${inputClass} mt-2`} autoComplete="off"/></label>
          <label>Release date, optional<input type="date" value={item.releaseDate} onChange={(event) => patch(setItems, item.id, { releaseDate: event.target.value })} className={`${inputClass} mt-2`}/></label>
          <label>Expiry date<input type="date" value={item.expiryDate} onChange={(event) => patch(setItems, item.id, { expiryDate: event.target.value })} className={`${inputClass} mt-2`}/></label>
        </>}
      </div>
    </div>)}
    {!items.length && <p className="text-sm text-slate-500">No entries added.</p>}
  </section>;
}
function Metric({ label, value }) { return <div><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
