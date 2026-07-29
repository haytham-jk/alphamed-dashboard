import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import SmoothNotice from "../components/ui/SmoothNotice";
import {
  findBioplexCalibratorLots,
  findBioplexKitLots,
  findBioplexQcLots,
  getBioplexCustomers,
  getBioplexProductsByType,
  getBioplexSession,
  saveBioplexInventory,
  correctBioplexInventory,
} from "../services/bioplexInventory";
import { getLocalDateOnly } from "../utils/dates";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const emptyManual = { assayName: "", productCode: "", productName: "", lotNumber: "", expiryDate: "", quantity: 1, calibratorLot: "", calibratorExpiry: "", calibratorQuantity: 0, notes: "" };
const isExpired = (value) => Boolean(value && value < getLocalDateOnly());
const makeKey = () => crypto.randomUUID();

function matchedStatus(expiryDate) {
  return isExpired(expiryDate) ? "Expired" : "Matched";
}

function makeLine(values) {
  return {
    productId: values.productId || null,
    materialType: values.materialType,
    lotNumber: values.lotNumber || "",
    quantity: values.quantity ?? 0,
    expiryDate: values.expiryDate || null,
    matchedKitLot: values.matchedKitLot || null,
    expectedCalibratorLot: values.expectedCalibratorLot || null,
    verificationStatus: values.verificationStatus || matchedStatus(values.expiryDate),
    assayName: values.assayName,
    productCode: values.productCode || "",
    productName: values.productName,
    notes: values.notes || "",
  };
}

function kitGroup(match) {
  return {
    key: makeKey(), kind: "kit-group", assayName: match.product.assay_name,
    kit: makeLine({ productId: match.product.id, materialType: "kit", lotNumber: match.kit_lot, quantity: 1, expiryDate: match.kit_expiry_date, expectedCalibratorLot: match.calibrator_lot, assayName: match.product.assay_name, productCode: match.product.product_code, productName: match.product.product_name }),
    calibrator: makeLine({ productId: match.calibrator_product?.id, materialType: "calibrator", lotNumber: match.calibrator_lot, quantity: 0, expiryDate: match.calibrator_expiry_date, matchedKitLot: match.kit_lot, expectedCalibratorLot: match.calibrator_lot, assayName: match.product.assay_name, productCode: match.calibrator_product?.product_code, productName: match.calibrator_product?.product_name || `BioPlex 2200 ${match.product.assay_name} Calibrator` }),
  };
}

function calibratorGroup(match) {
  return { key: makeKey(), kind: "standalone-calibrator", assayName: match.calibrator_product.assay_name, calibrator: makeLine({ productId: match.calibrator_product.id, materialType: "calibrator", lotNumber: match.calibrator_lot, quantity: 1, expiryDate: match.calibrator_expiry_date, expectedCalibratorLot: match.calibrator_lot, assayName: match.calibrator_product.assay_name, productCode: match.calibrator_product.product_code, productName: match.calibrator_product.product_name }) };
}

function qcGroup(match) {
  return { key: makeKey(), kind: "qc", assayName: match.product.assay_name, qc: makeLine({ productId: match.product.id, materialType: "qc", lotNumber: match.qc_lot, quantity: 1, expiryDate: match.expiry_date, assayName: match.product.assay_name, productCode: match.product.product_code, productName: match.product.product_name }) };
}

function consumableGroup(product) {
  return { key: makeKey(), kind: "consumable", assayName: "General", consumable: makeLine({ productId: product.id, materialType: "consumable", quantity: 1, assayName: "General", productCode: product.product_code, productName: product.product_name }) };
}

function storedLine(line) {
  return makeLine({ productId: line.product_id, materialType: line.material_type, lotNumber: line.lot_number, quantity: line.quantity, expiryDate: line.expiry_date, matchedKitLot: line.matched_kit_lot, expectedCalibratorLot: line.expected_calibrator_lot, verificationStatus: line.verification_status, assayName: line.assay_name_snapshot, productCode: line.product_code_snapshot, productName: line.product_name_snapshot, notes: line.notes });
}

function storedGroups(lines) {
  const groups = [];
  const linkedCalibrators = new Map(lines.filter((line) => line.material_type === "calibrator" && line.matched_kit_lot).map((line) => [line.matched_kit_lot, line]));
  for (const line of lines) {
    if (line.material_type === "kit") {
      const linked = linkedCalibrators.get(line.lot_number);
      groups.push({ key: makeKey(), kind: "kit-group", assayName: line.assay_name_snapshot, kit: storedLine(line), calibrator: linked ? storedLine(linked) : makeLine({ materialType: "calibrator", quantity: 0, matchedKitLot: line.lot_number, expectedCalibratorLot: line.expected_calibrator_lot, assayName: line.assay_name_snapshot, productName: `BioPlex 2200 ${line.assay_name_snapshot} Calibrator` }) });
    } else if (line.material_type === "calibrator" && !line.matched_kit_lot) {
      groups.push({ key: makeKey(), kind: "standalone-calibrator", assayName: line.assay_name_snapshot, calibrator: storedLine(line) });
    } else if (line.material_type === "qc") {
      groups.push({ key: makeKey(), kind: "qc", assayName: line.assay_name_snapshot, qc: storedLine(line) });
    } else if (line.material_type === "consumable") {
      groups.push({ key: makeKey(), kind: "consumable", assayName: "General", consumable: storedLine(line) });
    }
  }
  return groups;
}

export default function BioplexInventoryFormPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(sessionId);
  const [customers, setCustomers] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [countedOn, setCountedOn] = useState(getLocalDateOnly());
  const [notes, setNotes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [completedCorrection, setCompletedCorrection] = useState(false);
  const [groups, setGroups] = useState([]);
  const [lookup, setLookup] = useState({ kit: "", calibrator: "", qc: "" });
  const [choices, setChoices] = useState({ type: "", records: [] });
  const [manual, setManual] = useState({ type: "", values: emptyManual });
  const [showConsumables, setShowConsumables] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookupMessages, setLookupMessages] = useState({ kit: "", calibrator: "", qc: "" });
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    Promise.all([getBioplexCustomers(), getBioplexProductsByType("consumable"), editing ? getBioplexSession(sessionId) : Promise.resolve(null)])
      .then(([customerOptions, consumableOptions, result]) => {
        if (!active) return;
        setCustomers(customerOptions);
        setConsumables(consumableOptions);
        if (result) {
          const isCompleted = result.session.status === "Completed";
          if (result.session.status !== "Draft" && !isCompleted) throw new Error("This BioPlex session cannot be edited.");
          setCompletedCorrection(isCompleted);
          setCustomerId(String(result.session.customer_id));
          setCountedOn(result.session.counted_on);
          setNotes(result.session.notes || "");
          setGroups(storedGroups(result.lines));
        }
      })
      .catch((loadError) => active && setError(loadError.message || "Unable to load the stock count."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [editing, sessionId]);

  const outputLines = useMemo(() => groups.flatMap((group) => group.kind === "kit-group" ? [group.kit, group.calibrator] : [group[group.kind === "standalone-calibrator" ? "calibrator" : group.kind]]), [groups]);
  const review = useMemo(() => ({ total: outputLines.length, expired: outputLines.filter((line) => isExpired(line.expiryDate)).length, manual: outputLines.filter((line) => line.verificationStatus === "Manually Entered").length, mismatch: outputLines.filter((line) => line.verificationStatus === "Mismatch").length, zero: outputLines.filter((line) => Number(line.quantity) === 0).length }), [outputLines]);

  function changeLookup(type, value) { setLookup((current) => ({ ...current, [type]: value })); setChoices({ type: "", records: [] }); setLookupMessages((current) => ({ ...current, [type]: "" })); }
  function sameCalibrator(first, second) {
    return Boolean(
      first && second &&
      first.materialType === "calibrator" &&
      second.materialType === "calibrator" &&
      String(first.productId || "") === String(second.productId || "") &&
      first.lotNumber === second.lotNumber &&
      first.assayName === second.assayName
    );
  }
  function duplicateLine(materialType, lotNumber, productId) { return outputLines.find((line) => line.materialType === materialType && line.lotNumber === lotNumber && (!productId || String(line.productId || "") === String(productId || ""))); }
  function appendGroup(group) { setGroups((current) => [...current, group]); setDirty(true); setError(""); }

  async function runLookup(type) {
    const value = lookup[type].trim();
    if (!value || busy) return;
    try {
      setBusy(true); setError("");
      const records = type === "kit" ? await findBioplexKitLots(value) : type === "calibrator" ? await findBioplexCalibratorLots(value) : await findBioplexQcLots(value);
      if (!records.length) { setManual({ type, values: { ...emptyManual, lotNumber: value } }); return; }
      if (records.length > 1) { setChoices({ type, records }); return; }
      addMatch(type, records[0]);
    } catch (lookupError) { setError(lookupError.message || `Unable to find the ${type} lot.`); }
    finally { setBusy(false); }
  }

  function addMatch(type, record) {
    const group = type === "kit" ? kitGroup(record) : type === "calibrator" ? calibratorGroup(record) : qcGroup(record);
    const line = type === "kit" ? group.kit : type === "calibrator" ? group.calibrator : group.qc;

    if (type === "kit") {
      if (duplicateLine("kit", line.lotNumber, line.productId)) {
        setError(`${line.productName} lot ${line.lotNumber} is already recorded.`);
        return;
      }
      const standalone = groups.find(
        (current) => current.kind === "standalone-calibrator" && sameCalibrator(current.calibrator, group.calibrator)
      );
      if (standalone) {
        const linkedGroup = {
          ...group,
          calibrator: {
            ...group.calibrator,
            quantity: standalone.calibrator.quantity,
            notes: standalone.calibrator.notes,
          },
        };
        setGroups((current) => [
          ...current.filter((item) => item.key !== standalone.key),
          linkedGroup,
        ]);
        setError("");
        setLookupMessages((current) => ({
          ...current,
          kit: `Previously entered calibrator ${group.calibrator.lotNumber} was linked to kit ${group.kit.lotNumber}. Its quantity was preserved.`,
        }));
        setDirty(true);
      } else {
        appendGroup(group);
        setLookupMessages((current) => ({ ...current, kit: "" }));
      }
    } else if (type === "calibrator") {
      const linkedKit = groups.find(
        (current) => current.kind === "kit-group" && sameCalibrator(current.calibrator, group.calibrator)
      );
      if (linkedKit) {
        setError("");
        setLookupMessages((current) => ({
          ...current,
          calibrator: `Matching reagent kit ${linkedKit.kit.lotNumber} is already included in this stock count. Enter the calibrator quantity in the matching calibrator box below.`,
        }));
        setLookup((current) => ({ ...current, calibrator: "" }));
        setChoices({ type: "", records: [] });
        return;
      }
      if (duplicateLine("calibrator", line.lotNumber, line.productId)) {
        setError(`${line.productName} lot ${line.lotNumber} is already recorded. Increase its existing quantity instead.`);
        return;
      }
      appendGroup(group);
      setLookupMessages((current) => ({ ...current, calibrator: "" }));
    } else {
      if (duplicateLine("qc", line.lotNumber, line.productId)) {
        setError(`${line.productName} lot ${line.lotNumber} is already recorded. Increase its existing quantity instead.`);
        return;
      }
      appendGroup(group);
      setLookupMessages((current) => ({ ...current, qc: "" }));
    }
    setLookup((current) => ({ ...current, [type]: "" }));
    setChoices({ type: "", records: [] });
  }
  function addManual() {
    const { type, values } = manual;
    if (!values.assayName.trim() || !values.productName.trim() || !values.lotNumber.trim() || !values.expiryDate) { setError("Complete assay, product name, lot, and expiry for the manual entry."); return; }
    if (type === "kit") {
      const group = { key: makeKey(), kind: "kit-group", assayName: values.assayName.trim(), kit: makeLine({ materialType: "kit", lotNumber: values.lotNumber, quantity: values.quantity, expiryDate: values.expiryDate, expectedCalibratorLot: values.calibratorLot, verificationStatus: "Manually Entered", assayName: values.assayName.trim(), productCode: values.productCode, productName: values.productName.trim(), notes: values.notes }), calibrator: makeLine({ materialType: "calibrator", lotNumber: values.calibratorLot, quantity: values.calibratorQuantity, expiryDate: values.calibratorExpiry, matchedKitLot: values.lotNumber, expectedCalibratorLot: values.calibratorLot, verificationStatus: "Manually Entered", assayName: values.assayName.trim(), productName: `${values.assayName.trim()} Calibrator`, notes: values.notes }) };
      appendGroup(group);
    } else {
      const line = makeLine({ materialType: type, lotNumber: values.lotNumber, quantity: values.quantity, expiryDate: values.expiryDate, verificationStatus: "Manually Entered", assayName: values.assayName.trim(), productCode: values.productCode, productName: values.productName.trim(), notes: values.notes });
      appendGroup({ key: makeKey(), kind: type === "calibrator" ? "standalone-calibrator" : "qc", assayName: line.assayName, [type === "calibrator" ? "calibrator" : "qc"]: line });
    }
    setLookup((current) => ({ ...current, [type]: "" }));
    setManual({ type: "", values: emptyManual });
  }

  function addConsumable(product) {
    if (groups.some((group) => group.kind === "consumable" && group.consumable.productId === product.id)) { setError(`${product.product_name} is already recorded.`); return; }
    appendGroup(consumableGroup(product));
  }

  function updateGroup(key, part, changes) { setGroups((current) => current.map((group) => group.key === key ? { ...group, [part]: { ...group[part], ...changes } } : group)); setDirty(true); }
  function removeGroup(key) { setGroups((current) => current.filter((group) => group.key !== key)); setDirty(true); }

  async function save(status) {
    if (!customerId) return setError("Select a BioPlex customer.");
    if (!countedOn) return setError("Enter the stock-count date.");
    if (!outputLines.length) return setError("Add at least one stock item.");
    if (outputLines.some((line) => !line.productName.trim() || !line.assayName.trim())) return setError("Each stock line requires a product name and assay or category.");
    if (outputLines.some((line) => !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 0)) return setError("All quantities must be whole numbers of zero or greater.");
    const calibratorLines = outputLines.filter((line) => line.materialType === "calibrator");
    const duplicateCalibrator = calibratorLines.find((line, index) => calibratorLines.some((other, otherIndex) => otherIndex > index && sameCalibrator(line, other)));
    if (duplicateCalibrator) return setError(`Calibrator ${duplicateCalibrator.lotNumber} is recorded more than once. Keep it either linked to its kit or standalone.`);
    try {
      setBusy(true); setError("");
      if (completedCorrection) {
        if (!correctionReason.trim()) return setError("Enter a correction reason before saving changes to a completed count.");
        await correctBioplexInventory({ sessionId, customerId, countedOn, notes, reason: correctionReason, lines: outputLines });
      } else {
        await saveBioplexInventory({ sessionId: editing ? sessionId : null, customerId, countedOn, notes, status, lines: outputLines });
      }
      setDirty(false);
      navigate("/bioplex-inventory", { state: { message: completedCorrection ? "Completed BioPlex count corrected successfully." : status === "Completed" ? "BioPlex stock count completed successfully." : "BioPlex stock count saved as draft." } });
    } catch (saveError) { setError(saveError.message || "Unable to save the BioPlex stock count."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading BioPlex stock count...</div>;

  return <div className="mx-auto max-w-5xl space-y-5">
    <header><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">{editing ? "Continue stock count" : "New stock count"}</h1><p className="mt-1 text-slate-400">Enter only observed stock. Missing products remain not recorded, not zero.</p></header>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
      <label>Customer<select className={`${inputClass} mt-2`} value={customerId} onChange={(event) => { setCustomerId(event.target.value); setDirty(true); }}><option value="">Select BioPlex customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.emirate ? `, ${customer.emirate}` : ""}</option>)}</select></label>
      <label>Count date<input type="date" className={`${inputClass} mt-2`} value={countedOn} onChange={(event) => { setCountedOn(event.target.value); setDirty(true); }} /></label>
      <label className="md:col-span-2">Notes<textarea rows={3} className={`${inputClass} mt-2`} value={notes} onChange={(event) => { setNotes(event.target.value); setDirty(true); }} /></label>
      {completedCorrection && <label className="md:col-span-2">Correction reason<textarea rows={2} required className={`${inputClass} mt-2`} value={correctionReason} onChange={(event) => { setCorrectionReason(event.target.value); setDirty(true); }} placeholder="Explain why this completed count is being corrected" /></label>}
    </section>

    <Lookup title="Reagent kits and matching calibrators" type="kit" value={lookup.kit} onChange={changeLookup} onAdd={runLookup} busy={busy} placeholder="Enter kit lot, for example 301906" message={lookupMessages.kit} />
    <Lookup title="Standalone calibrators" type="calibrator" value={lookup.calibrator} onChange={changeLookup} onAdd={runLookup} busy={busy} placeholder="Enter calibrator lot, for example 55111" message={lookupMessages.calibrator} />
    <Lookup title="Independent QC materials" type="qc" value={lookup.qc} onChange={changeLookup} onAdd={runLookup} busy={busy} placeholder="Enter QC lot, for example 55345" message={lookupMessages.qc} />

    {choices.records.length > 0 && <ChoicePanel choices={choices} onChoose={addMatch} />}
    {manual.type && <ManualPanel manual={manual} setManual={setManual} onAdd={addManual} onCancel={() => setManual({ type: "", values: emptyManual })} />}

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <button type="button" onClick={() => setShowConsumables((value) => !value)} className="flex w-full items-center justify-between text-left"><span className="text-xl font-semibold">General consumables</span>{showConsumables ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</button>
      {showConsumables && <div className="mt-4 flex flex-wrap gap-2">{consumables.map((product) => <button key={product.id} type="button" onClick={() => addConsumable(product)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"><Plus size={15} className="mr-1 inline" aria-hidden="true" />{product.product_name}</button>)}</div>}
    </section>

    <section className="space-y-3">{groups.map((group) => <InventoryGroup key={group.key} group={group} onUpdate={updateGroup} onRemove={removeGroup} />)}{!groups.length && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No stock has been entered.</div>}</section>

    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-5"><Summary label="Lines" value={review.total} /><Summary label="Expired" value={review.expired} /><Summary label="Manual" value={review.manual} /><Summary label="Mismatch" value={review.mismatch} /><Summary label="Confirmed zero" value={review.zero} /></section>

    <div className="flex flex-wrap justify-between gap-3"><Link to="/bioplex-inventory" onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18} aria-hidden="true" />Back to inventory</Link><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => confirmDiscard() && navigate("/bioplex-inventory")} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button>{completedCorrection ? <button type="button" disabled={busy} onClick={() => save("Completed")} className="rounded-xl bg-emerald-600 px-4 py-2 font-medium">Save correction</button> : <><button type="button" disabled={busy} onClick={() => save("Draft")} className="rounded-xl border border-blue-700 px-4 py-2 text-blue-300">Save draft</button><button type="button" disabled={busy} onClick={() => save("Completed")} className="rounded-xl bg-emerald-600 px-4 py-2 font-medium">Complete count</button></>}</div></div>
  </div>;
}

function Lookup({ title, type, value, onChange, onAdd, busy, placeholder, message }) { return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input className={inputClass} value={value} onChange={(event) => onChange(type, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(type); } }} placeholder={placeholder} /><button type="button" disabled={busy || !value.trim()} onClick={() => onAdd(type)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium disabled:opacity-50"><Plus size={17} aria-hidden="true" />Add</button></div><SmoothNotice message={message} /></section>; }
function ChoicePanel({ choices, onChoose }) { return <section className="rounded-xl border border-amber-900 bg-amber-950/30 p-4"><p className="text-amber-300">This lot has multiple matches. Select the correct assay:</p><div className="mt-3 flex flex-wrap gap-2">{choices.records.map((record, index) => { const product = choices.type === "calibrator" ? record.calibrator_product : record.product; const expiry = choices.type === "kit" ? record.kit_expiry_date : choices.type === "calibrator" ? record.calibrator_expiry_date : record.expiry_date; return <button key={`${product.id}-${expiry}-${index}`} type="button" onClick={() => onChoose(choices.type, record)} className="rounded-xl border border-amber-800 px-3 py-2 text-sm">{product.assay_name}, expires {expiry}</button>; })}</div></section>; }

function ManualPanel({ manual, setManual, onAdd, onCancel }) {
  const values = manual.values;
  const patch = (changes) => setManual((current) => ({ ...current, values: { ...current.values, ...changes } }));
  return <section className="space-y-4 rounded-2xl border border-amber-900 bg-amber-950/20 p-5"><div><h2 className="text-xl font-semibold">Manual {manual.type} entry</h2><p className="text-sm text-amber-300">This lot was not found in the current reference data.</p></div><div className="grid gap-4 md:grid-cols-3"><Field label="Assay" value={values.assayName} onChange={(value) => patch({ assayName: value })} /><Field label="Product name" value={values.productName} onChange={(value) => patch({ productName: value })} /><Field label="Product code" value={values.productCode} onChange={(value) => patch({ productCode: value })} /><Field label="Lot" value={values.lotNumber} onChange={(value) => patch({ lotNumber: value })} /><Field label="Expiry" type="date" value={values.expiryDate} onChange={(value) => patch({ expiryDate: value })} /><Field label="Quantity" type="number" value={values.quantity} onChange={(value) => patch({ quantity: value })} />{manual.type === "kit" && <><Field label="Calibrator lot" value={values.calibratorLot} onChange={(value) => patch({ calibratorLot: value })} /><Field label="Calibrator expiry" type="date" value={values.calibratorExpiry} onChange={(value) => patch({ calibratorExpiry: value })} /><Field label="Calibrator quantity" type="number" value={values.calibratorQuantity} onChange={(value) => patch({ calibratorQuantity: value })} /></>}<label className="md:col-span-3">Notes<textarea className={`${inputClass} mt-2`} rows={2} value={values.notes} onChange={(event) => patch({ notes: event.target.value })} /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button><button type="button" onClick={onAdd} className="rounded-xl bg-amber-600 px-4 py-2 font-medium">Add manual entry</button></div></section>;
}

function InventoryGroup({ group, onUpdate, onRemove }) {
  const part = group.kind === "standalone-calibrator" ? "calibrator" : group.kind;
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between gap-3"><div><p className="text-sm text-blue-400">{group.assayName}</p><h3 className="font-semibold">{group.kind === "kit-group" ? "Kit and calibrator" : group.kind === "standalone-calibrator" ? "Standalone calibrator" : group.kind === "qc" ? "QC material" : "General consumable"}</h3></div><button type="button" onClick={() => onRemove(group.key)} className="rounded-lg p-2 text-red-300"><Trash2 size={18} aria-hidden="true" /></button></div>{group.kind === "kit-group" ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><MaterialCard line={group.kit} title="Reagent kit" onChange={(changes) => onUpdate(group.key, "kit", changes)} /><div><MaterialCard line={group.calibrator} title="Matching calibrator" onChange={(changes) => onUpdate(group.key, "calibrator", changes)} /></div></div> : <div className="mt-4"><MaterialCard line={group[part]} title={group.kind === "consumable" ? "Consumable" : group.kind === "qc" ? "QC material" : "Standalone calibrator"} editableLot={group.kind === "consumable" || group[part].verificationStatus === "Manually Entered"} onChange={(changes) => onUpdate(group.key, part, changes)} /></div>}</article>;
}

function MaterialCard({ line, title, editableLot = false, onChange }) { return <div className="rounded-xl bg-slate-950 p-4"><div className="flex justify-between gap-2"><p className="text-sm font-medium text-slate-300">{title}</p><span className="text-xs text-slate-500">{line.verificationStatus}</span></div><p className="mt-2 font-medium">{line.productName}</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{editableLot ? <Field label="Lot" value={line.lotNumber} onChange={(value) => onChange({ lotNumber: value })} /> : <Read label="Lot" value={line.lotNumber || "Not listed"} />}{editableLot ? <Field label="Expiry" type="date" value={line.expiryDate || ""} onChange={(value) => onChange({ expiryDate: value, verificationStatus: isExpired(value) ? "Expired" : line.verificationStatus })} /> : <Read label="Expiry" value={line.expiryDate || "Not listed"} warning={isExpired(line.expiryDate)} />}<Field label="Quantity" type="number" value={line.quantity} onChange={(value) => onChange({ quantity: value })} /></div></div>; }
function Field({ label, value, onChange, type = "text" }) { return <label>{label}<input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "1" : undefined} className={`${inputClass} mt-2`} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function Read({ label, value, warning }) { return <div><p className="text-sm text-slate-500">{label}</p><p className={warning ? "mt-2 text-red-300" : "mt-2"}>{value}{warning ? " (Expired)" : ""}</p></div>; }
function Summary({ label, value }) { return <div><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
