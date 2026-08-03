export function parseStrictDisplayDate(value) {
  const raw = String(value ?? "").trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) return { value: null, error: "Use DD/MM/YYYY." };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const test = new Date(Date.UTC(year, month - 1, day));
  if (
    test.getUTCFullYear() !== year ||
    test.getUTCMonth() !== month - 1 ||
    test.getUTCDate() !== day
  ) return { value: null, error: "Enter a valid calendar date in DD/MM/YYYY." };
  return {
    value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    error: "",
  };
}
