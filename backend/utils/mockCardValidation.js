function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateExpiryFuture(expiryTrimmed) {
  if (!/^\d{2}\/\d{2}$/.test(expiryTrimmed)) {
    return { ok: false, message: 'Expiry must be MM/YY.' };
  }
  const [mmStr, yyStr] = expiryTrimmed.split('/');
  const month = Number(mmStr);
  const year = 2000 + Number(yyStr);
  if (month < 1 || month > 12) {
    return { ok: false, message: 'Enter a valid month (01–12).' };
  }
  const endOfExpiryMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  if (endOfExpiryMonth < new Date()) {
    return { ok: false, message: 'Card has expired. Enter a future expiry date.' };
  }
  return { ok: true };
}

function validateMockCard({ cardNumber, expiry, cvv }) {
  const num = digitsOnly(cardNumber);
  if (num.length < 16) {
    return { ok: false, message: 'Card number must be at least 16 digits.' };
  }
  const expiryTrimmed = String(expiry || '').trim();
  const expiryCheck = validateExpiryFuture(expiryTrimmed);
  if (!expiryCheck.ok) return expiryCheck;
  const cvvDigits = digitsOnly(cvv);
  if (cvvDigits.length !== 3) {
    return { ok: false, message: 'CVV must be 3 digits.' };
  }
  return { ok: true, cardLast4: num.slice(-4) };
}

module.exports = {
  digitsOnly,
  validateMockCard,
};
