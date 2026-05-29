/**
 * Validates card expiry in MM/YY format.
 * @returns {string|null} Error message, or null if valid / still incomplete.
 */
export function getCardExpiryError(expiry) {
  const trimmed = String(expiry || '').trim();
  if (!trimmed) return null;

  if (!/^\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.length >= 5 ? 'Expiry must be MM/YY.' : null;
  }

  const [mmStr, yyStr] = trimmed.split('/');
  const month = Number(mmStr);
  const year = 2000 + Number(yyStr);

  if (month < 1 || month > 12) {
    return 'Enter a valid month (01–12).';
  }

  const endOfExpiryMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  if (endOfExpiryMonth < new Date()) {
    return 'Card has expired. Enter a future expiry date.';
  }

  return null;
}

export function isCardExpiryValid(expiry) {
  return /^\d{2}\/\d{2}$/.test(String(expiry || '').trim()) && getCardExpiryError(expiry) === null;
}
