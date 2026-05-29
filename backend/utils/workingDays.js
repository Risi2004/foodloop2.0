function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addWorkingDays(startDate, days) {
  const result = new Date(startDate);
  let remaining = Math.max(0, Number(days) || 0);

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }

  return result;
}

function formatTransferDueDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = {
  addWorkingDays,
  formatTransferDueDate,
  isWeekend,
};
