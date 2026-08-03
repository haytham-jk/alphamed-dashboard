import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { findBioplexMatches } from "../services/bioplexMatching";
import { getBioplexCount, getBioplexCustomers, saveBioplexCount } from "../services/bioplexInventory";
import { formatBioplexDate, localDateOnly } from "../utils/bioplexDates";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500";
const makeKey = () => crypto.randomUUID();

function itemFromMatch(row, quantity = "") {
  return {
    clientKey: makeKey(),
    assayId: row.assay_id,
    productId: row.product_id,
    referenceLotId: row.lot_id,
    materialType: row.material_type,
    lotNumber: row.lot_number,
    quantity,
    expiryDate: row.expiry_date || "",
    verificationStatus: "Matched",
    assayName: row.assay_name,
    productCode: row.product_code || "",
    productName: row.product_name || `${row.assay_name} ${row.material_type}`,
    matchingImportId: row.source_import_id,
    notes: "",
  };
}

function relatedItem(row) {
  return {
    clientKey: makeKey(),
    assayId: row.assay_id,
    productId: null,
    referenceLotId: row.related_lot_id,
    materialType: row.related_material_type,
    lotNumber: row.related_lot_number,
    quantity: "",
    expiryDate: row.related_expiry_date || "",
    verificationStatus: "Matched",
    assayName: row.assay_name,
    productCode: "",
    productName: `${row.assay_name} ${row.related_material_type}`,
    matchingImportId: row.source_import_id,
    notes: "",
  };
}

function uniqueLinks(existing, additions) {
  return additions.filter((candidate) => !existing.some((link) =>
    link.parentKey === candidate.parentKey &&
    link.childKey === candidate.childKey &&
    link.relationshipType === candidate.relationshipType
  ));
}

export default function BioplexInventoryFormPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(sessionId);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [countedOn, setCountedOn] = useState(localDateOnly());
  const [notes, setNotes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [previousStatus, setPreviousStatus] = useState("Draft");
  const [items, setItems] = useState([]);
  const [links, setLinks] = useState([]);
  const [lookup, setLookup] = useState({ kit: "", calibrator: "", qc: "" });
  const [quantity, setQuantity] = useState({ kit: "", calibrator: "", qc: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const customerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getBioplexCustomers(),
      editing ? getBioplexCount(sessionId) : Promise.resolve(null),
    ]).then(([options, record]) => {
      setCustomers(options);
      if (!record) return;
      setCustomerId(String(record.count.customer_id));
      setCountedOn(record.count.counted_on);
      setNotes(record.count.notes || "");
      setPreviousStatus(record.count.status);
      const mapped = record.items.map((item) => ({
        clientKey: String(item.id),
        assayId: item.assay_id,
        productId: item.product_id,
        referenceLotId: item.reference_lot_id,
        materialType: item.material_type,
        lotNumber: item.lot_number || "",
        quantity: item.quantity ?? "",
        expiryDate: item.expiry_date || "",
        verificationStatus: item.verification_status,
        assayName: item.assay_name_snapshot,
        productCode: item.product_code_snapshot || "",
        productName: item.product_name_snapshot,
        matchingImportId: item.matching_import_id,
        notes: item.notes || "",
      }));
      const keys = new Map(record.items.map((item) => [item.id, String(item.id)]));
      setItems(mapped);
      setLinks(record.links.map((link) => ({
        parentKey: keys.get(link.parent_item_id),
        childKey: keys.get(link.child_item_id),
        relationshipType: link.relationship_type,
      })));
    }).catch((loadError) => setError(loadError.message));
  }, [editing, sessionId]);

  const grouped = useMemo(() => {
    const childKeys = new Set(links.map((link) => link.childKey));
    return items.filter((item) => !childKeys.has(item.clientKey)).map((root) => ({
      root,
      children: links
        .filter((link) => link.parentKey === root.clientKey)
        .map((link) => items.find((item) => item.clientKey === link.childKey))
        .filter(Boolean),
    }));
  }, [items, links]);

  function clearLookup(type) {
    setLookup((current) => ({ ...current, [type]: "" }));
    setQuantity((current) => ({ ...current, [type]: "" }));
  }

  function addOrUpdateLinks(additions) {
    if (!additions.length) return;
    setLinks((current) => [...current, ...uniqueLinks(current, additions)]);
  }

  async function add(type) {
    const lot = lookup[type].trim();
    if (!lot) return;
    try {
      setBusy(true);
      setError("");
      const results = await findBioplexMatches(lot, type, false);
      if (!results.length) throw new Error("Lot not found in active matching data.");
      const first = results[0];
      const enteredQuantity = quantity[type];
      const existing = items.find((item) =>
        item.materialType === type && item.referenceLotId === first.lot_id
      );

      if (existing && type === "kit") {
        throw new Error("This reagent lot is already included.");
      }

      if (existing && ["calibrator", "qc"].includes(type)) {
        const increment = enteredQuantity === "" ? 1 : Number(enteredQuantity);
        const currentQuantity = existing.quantity === "" || existing.quantity === null
          ? 0
          : Number(existing.quantity);
        if (!Number.isInteger(increment) || increment < 0) {
          throw new Error("Quantity must be a whole number of zero or greater.");
        }
        setItems((current) => current.map((item) =>
          item.clientKey === existing.clientKey
            ? { ...item, quantity: String(currentQuantity + increment) }
            : item
        ));

        if (type === "calibrator") {
          const matchingReagents = items.filter((item) =>
            item.materialType === "kit" && results.some((row) =>
              row.relationship_type === "kit_calibrator" &&
              row.related_lot_id === item.referenceLotId
            )
          );
          addOrUpdateLinks(matchingReagents.map((reagent) => ({
            parentKey: reagent.clientKey,
            childKey: existing.clientKey,
            relationshipType: "kit_calibrator",
          })));
        } else {
          const assayReagents = items.filter((item) =>
            item.materialType === "kit" && item.assayId === first.assay_id
          );
          addOrUpdateLinks(assayReagents.map((reagent) => ({
            parentKey: reagent.clientKey,
            childKey: existing.clientKey,
            relationshipType: "kit_qc",
          })));
        }
        clearLookup(type);
        return;
      }

      const main = itemFromMatch(first, enteredQuantity);

      if (type === "kit") {
        const calibratorRows = results.filter((row) =>
          row.relationship_type === "kit_calibrator" &&
          row.related_material_type === "calibrator" &&
          row.related_lot_id
        );
        const newCalibrators = [];
        const additions = [];
        for (const row of calibratorRows) {
          let calibrator = items.find((item) =>
            item.materialType === "calibrator" && item.referenceLotId === row.related_lot_id
          );
          if (!calibrator) {
            calibrator = newCalibrators.find((item) => item.referenceLotId === row.related_lot_id);
          }
          if (!calibrator) {
            calibrator = relatedItem(row);
            newCalibrators.push(calibrator);
          }
          additions.push({
            parentKey: main.clientKey,
            childKey: calibrator.clientKey,
            relationshipType: "kit_calibrator",
          });
        }

        const existingQc = items.filter((item) =>
          item.materialType === "qc" && item.assayId === first.assay_id
        );
        additions.push(...existingQc.map((qc) => ({
          parentKey: main.clientKey,
          childKey: qc.clientKey,
          relationshipType: "kit_qc",
        })));

        setItems((current) => [...current, main, ...newCalibrators]);
        addOrUpdateLinks(additions);
      } else if (type === "calibrator") {
        const matchingReagents = items.filter((item) =>
          item.materialType === "kit" && results.some((row) =>
            row.relationship_type === "kit_calibrator" &&
            row.related_lot_id === item.referenceLotId
          )
        );
        setItems((current) => [...current, main]);
        addOrUpdateLinks(matchingReagents.map((reagent) => ({
          parentKey: reagent.clientKey,
          childKey: main.clientKey,
          relationshipType: "kit_calibrator",
        })));
      } else {
        const assayReagents = items.filter((item) =>
          item.materialType === "kit" && item.assayId === first.assay_id
        );
        setItems((current) => [...current, main]);
        addOrUpdateLinks(assayReagents.map((reagent) => ({
          parentKey: reagent.clientKey,
          childKey: main.clientKey,
          relationshipType: "kit_qc",
        })));
      }
      clearLookup(type);
    } catch (addError) {
      setError(addError.message);
    } finally {
      setBusy(false);
    }
  }

  function updateItem(id, changes) {
    setItems((current) => current.map((item) =>
      item.clientKey === id ? { ...item, ...changes } : item
    ));
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.clientKey !== id));
    setLinks((current) => current.filter((link) =>
      link.parentKey !== id && link.childKey !== id
    ));
  }

  async function save(status) {
    if (!customerId) {
      setError("Select a BioPlex customer.");
      customerRef.current?.focus();
      return;
    }
    if (!items.length) {
      setError("Add at least one stock item.");
      return;
    }
    const missing = items.find((item) =>
      status === "Completed" && (item.quantity === "" || item.quantity === null)
    );
    if (missing) {
      setError("Enter every quantity before completing the count.");
      requestAnimationFrame(() => document.querySelector(`[data-key="${missing.clientKey}"]`)?.focus());
      return;
    }
    if (items.some((item) =>
      item.quantity !== "" && (!/^\d+$/.test(String(item.quantity)) || Number(item.quantity) < 0)
    )) {
      setError("Quantities must be whole numbers of zero or greater.");
      return;
    }
    if (["Completed", "Exported"].includes(previousStatus) && !correctionReason.trim()) {
      setError("Enter a correction reason.");
      document.querySelector("[data-correction]")?.focus();
      return;
    }
    try {
      setBusy(true);
      const id = await saveBioplexCount({
        countId: sessionId,
        customerId,
        countedOn,
        notes,
        status,
        items,
        links,
        correctionReason,
      });
      navigate(`/bioplex-inventory/${id}`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="mx-auto max-w-6xl space-y-5">
    <header><p className="text-sm text-blue-400">BioPlex Inventory</p><h1 className="text-3xl font-semibold">{editing ? "Edit stock count" : "New stock count"}</h1></header>
    {error && <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
      <label>Customer<select ref={customerRef} className={`${inputClass} mt-2`} value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.emirate ? `, ${customer.emirate}` : ""}</option>)}</select></label>
      <label>Count date<input type="date" className={`${inputClass} mt-2`} value={countedOn} onChange={(event) => setCountedOn(event.target.value)}/><span className="mt-1 block text-xs text-slate-500">{formatBioplexDate(countedOn)}</span></label>
      <label className="md:col-span-2">Notes<textarea rows={2} className={`${inputClass} mt-2`} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
      {["Completed", "Exported"].includes(previousStatus) && <label className="md:col-span-2">Correction reason<textarea data-correction rows={2} className={`${inputClass} mt-2`} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)}/></label>}
    </section>

    {["kit", "calibrator", "qc"].map((type) => <section key={type} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-xl font-semibold">{type === "kit" ? "Reagent kit" : type === "calibrator" ? "Standalone calibrator" : "QC material"}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <input className={inputClass} value={lookup[type]} onChange={(event) => setLookup((current) => ({ ...current, [type]: event.target.value }))} placeholder="Lot number"/>
        <input type="number" min="0" step="1" className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} value={quantity[type]} onChange={(event) => setQuantity((current) => ({ ...current, [type]: event.target.value }))} placeholder="Qty optional"/>
        <button disabled={busy || !lookup[type].trim()} onClick={() => add(type)} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2 disabled:opacity-50"><Plus size={17}/>Add</button>
      </div>
    </section>)}

    <section className="space-y-3">
      {grouped.map((group) => <article key={group.root.clientKey} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex justify-between"><div><p className="text-sm text-blue-400">{group.root.assayName}</p><h3 className="font-semibold">{group.root.productName}</h3></div><button onClick={() => removeItem(group.root.clientKey)} className="text-red-300"><Trash2 size={18}/></button></div>
        <Material item={group.root} update={updateItem}/>
        {group.children.map((child) => <div key={child.clientKey} className="mt-3 border-t border-slate-800 pt-3"><Material item={child} update={updateItem}/></div>)}
      </article>)}
      {!items.length && <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No stock items added.</div>}
    </section>

    <div className="flex flex-wrap justify-between gap-3"><Link to="/bioplex-inventory" className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><ArrowLeft size={18}/>Back</Link><div className="flex gap-2"><button disabled={busy} onClick={() => save("Draft")} className="h-10 rounded-xl border border-blue-700 px-4 py-2 text-blue-300">Save draft</button><button disabled={busy} onClick={() => save("Completed")} className="h-10 rounded-xl bg-emerald-600 px-4 py-2 font-medium">Complete count</button></div></div>
  </div>;
}

function Material({ item, update }) {
  return <div className="mt-3 grid gap-3 sm:grid-cols-4"><Read label="Type" value={item.materialType}/><Read label="Lot" value={item.lotNumber || "Not recorded"}/><Read label="Expiry" value={formatBioplexDate(item.expiryDate) || "Not recorded"}/><label>Quantity<input data-key={item.clientKey} type="number" min="0" step="1" className={`${inputClass} mt-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} value={item.quantity} onChange={(event) => update(item.clientKey, { quantity: event.target.value })}/></label></div>;
}
function Read({ label, value }) { return <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2">{value}</p></div>; }
