const COLOMBO_TZ = 'Asia/Colombo';

function formatColomboParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return map;
}

function getColomboDateKey(date = new Date()) {
  const { year, month, day } = formatColomboParts(date);
  return `${year}-${month}-${day}`;
}

function getColomboYearMonth(date = new Date()) {
  const { year, month } = formatColomboParts(date);
  return `${year}-${month}`;
}

/** Last instant of calendar month YYYY-MM (server local Date; used for expiry checks). */
function getMonthEndDate(yearMonth) {
  const [yearStr, monthStr] = String(yearMonth).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('Invalid yearMonth');
  }
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function getCurrentMonthEnd() {
  return getMonthEndDate(getColomboYearMonth());
}

/** One calendar month after `date` (end of paid subscription period). */
function addOneCalendarMonth(date = new Date()) {
  const start = new Date(date);
  const day = start.getDate();
  start.setMonth(start.getMonth() + 1);
  if (start.getDate() < day) {
    start.setDate(0);
  }
  start.setHours(23, 59, 59, 999);
  return start;
}

module.exports = {
  COLOMBO_TZ,
  formatColomboParts,
  getColomboDateKey,
  getColomboYearMonth,
  getMonthEndDate,
  getCurrentMonthEnd,
  addOneCalendarMonth,
};
