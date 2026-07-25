export default function CaseSourceSelector({ options = [], value = [], onChange }) {
  function toggleSource(source) {
    onChange(value.includes(source) ? value.filter((item) => item !== source) : [...value, source]);
  }
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Sources / product areas</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((source) => {
          const selected = value.includes(source);
          return (
            <button key={source} type="button" aria-pressed={selected} onClick={() => toggleSource(source)} className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${selected ? "border-blue-600 bg-blue-950 text-blue-300" : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"}`}>
              {source}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
