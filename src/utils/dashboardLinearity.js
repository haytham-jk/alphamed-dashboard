export function normalizeDashboardLinearitySummary(payload) {
  const summary = payload && typeof payload === "object" ? payload : {};
  return {
    attentionCount: Math.max(0, Number(summary.attention_count) || 0),
    attentionRecords: Array.isArray(summary.attention_records)
      ? summary.attention_records.map((record) => ({
          id: Number(record.id),
          customerName: String(record.customer_name ?? "").trim(),
          instrumentName: String(record.instrument_name ?? "").trim(),
          instrumentNameSnapshot: String(
            record.instrument_name_snapshot ?? ""
          ).trim(),
          performedDate: record.performed_date || null,
          frequencyMonths: Number(record.frequency_months),
          nextDueDate: record.next_due_date || null,
          daysRemaining: Number(record.days_remaining),
          dueStatus: String(record.due_status ?? ""),
        }))
      : [],
  };
}
