// 환율 유틸리티 (fetch + 수동저장 + fallback)

export async function fetchExchangeRate(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=KRW');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.rates.KRW;
  } catch (e) {
    return null;
  }
}

export function getManualExchangeRate(): number | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem('manualExchangeRate');
  if (!val) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

export function setManualExchangeRate(rate: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('manualExchangeRate', String(rate));
}

export async function getEffectiveExchangeRate(): Promise<{rate: number|null, source: 'realtime'|'manual'|null}> {
  const real = await fetchExchangeRate();
  if (real && real > 0) return { rate: real, source: 'realtime' };
  const manual = getManualExchangeRate();
  if (manual && manual > 0) return { rate: manual, source: 'manual' };
  return { rate: null, source: null };
} 