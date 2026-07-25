export function calculateNextDueDate(performedDate, frequencyMonths) {
  const frequency = Number(frequencyMonths);
  if (!performedDate || ![6, 12].includes(frequency)) return null;
  const [year, month, day] = performedDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const targetMonthIndex = month - 1 + frequency;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const result = new Date(targetYear, targetMonth, Math.min(day, lastDay), 12);
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const dd = String(result.getDate()).padStart(2, '0');
  return `${result.getFullYear()}-${mm}-${dd}`;
}

export function calculateDaysRemaining(performedDate, frequencyMonths) {
  const nextDueDate = calculateNextDueDate(performedDate, frequencyMonths);
  if (!nextDueDate) return null;
  const due = new Date(`${nextDueDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export function getLinearityDueStatus(daysRemaining) {
  if (daysRemaining === null) return 'Not scheduled';
  if (daysRemaining < 0) return 'Overdue';
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining <= 30) return 'Due soon';
  return 'On schedule';
}

export function formatFrequency(value) {
  if (Number(value) === 6) return '6 Months';
  if (Number(value) === 12) return '1 Year';
  return 'Not set';
}

export function formatRemainingPeriod(value) {
  if (value === null) return 'Not scheduled';
  if (value < 0) return `${Math.abs(value)} days overdue`;
  if (value === 0) return 'Due today';
  return `${value} days remaining`;
}
