import { useEffect, useMemo, useState } from "react";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { useNavigate } from "react-router-dom";
import CaseForm from "../components/cases/CaseForm";
import { createEmptyCaseValues } from "../constants/caseOptions";
import { createSupportCase } from "../services/caseMutations";
import { getCustomerOptions } from "../services/customers";

export default function NewCasePage({ session }) {
  const navigate = useNavigate();
  const initialValues = useMemo(
    () => createEmptyCaseValues(),
    []
  );
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const { confirmDiscard } = useUnsavedChanges(dirty);

  useEffect(() => {
    getCustomerOptions()
      .then(setCustomers)
      .catch((loadError) => setError(loadError.message));
  }, []);

  async function handleSubmit(values) {
    const created = await createSupportCase(
      values,
      session.user.id
    );
    setDirty(false);
      navigate(`/cases/${created.id}`, { state: { message: "Case saved successfully." } });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-sm text-blue-400">Cases</p>
        <h1 className="text-3xl font-semibold">
          New case
        </h1>
      </header>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}

      <CaseForm
        mode="create"
        initialValues={initialValues}
        customers={customers}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/cases")}
      />
    </div>
  );
}
