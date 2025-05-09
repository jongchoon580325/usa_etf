'use client';
import { FaTools } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { fetchExchangeRate, getManualExchangeRate, setManualExchangeRate, getEffectiveExchangeRate } from '../../components/exchangeRateUtil';

export default function DataManagePage() {
  // 테마
  const [theme, setTheme] = useState<'dark' | 'light' | undefined>(undefined);
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);
  useEffect(() => {
    if (!theme) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // 환율 상태
  const [realtimeRate, setRealtimeRate] = useState<number | null>(null);
  const [manualRate, setManualRate] = useState<number | null>(null);
  const [effectiveRate, setEffectiveRate] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<'realtime'|'manual'|null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState(false);
  const [manualInput, setManualInput] = useState('');
  useEffect(() => {
    let mounted = true;
    setRateLoading(true);
    (async () => {
      const real = await fetchExchangeRate();
      const manual = getManualExchangeRate();
      setRealtimeRate(real);
      setManualRate(manual);
      const eff = await getEffectiveExchangeRate();
      if (!mounted) return;
      setEffectiveRate(eff.rate);
      setRateSource(eff.source);
      setRateLoading(false);
      setRateError(!eff.rate);
      setManualInput(manual ? String(manual) : '');
    })();
    return () => { mounted = false; };
  }, []);
  const handleManualSave = () => {
    const num = Number(manualInput);
    if (!num || num <= 0) return;
    setManualExchangeRate(num);
    setManualRate(num);
    setEffectiveRate(num);
    setRateSource('manual');
    setRateError(false);
  };

  // 세금
  const [taxRate, setTaxRate] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('taxRate');
    if (saved !== null) setTaxRate(saved);
  }, []);
  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxRate(e.target.value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taxRate', e.target.value);
    }
  };

  return (
    <div>
      <section className="flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2 mt-8">
          <FaTools className="text-5xl text-sky-400 drop-shadow-lg" />
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">자료관리</h1>
          <p className="text-lg text-neutral-400 mt-2 text-center max-w-xl">
            포트폴리오에 필요한 각종 유틸리티와 데이터 관리 기능을 제공합니다.
          </p>
          <div className="w-full max-w-2xl border-t border-dashed border-neutral-700 my-8" />
        </div>
        {/* 상단 3분할 카드 레이아웃 */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
          {/* (좌) 환율 */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow p-6 flex flex-col gap-2">
            <h2 className="text-lg font-semibold mb-2">현재 달러 환율</h2>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{rateLoading ? '로딩중...' : effectiveRate ? `${effectiveRate.toLocaleString()}원` : 'N/A'}</span>
              {rateSource === 'realtime' && <span className="px-2 py-1 rounded bg-emerald-700 text-white text-xs font-bold">실시간</span>}
              {rateSource === 'manual' && <span className="px-2 py-1 rounded bg-yellow-700 text-white text-xs font-bold">수동</span>}
              {rateError && <span className="px-2 py-1 rounded bg-red-700 text-white text-xs font-bold">오류</span>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                className="border rounded px-3 py-2 w-28 dark:bg-gray-900 dark:text-white"
                placeholder="수동 입력"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
              />
              <button
                className="px-4 py-2 rounded bg-yellow-700 text-white font-bold hover:bg-yellow-600"
                onClick={handleManualSave}
                disabled={!manualInput || Number(manualInput) <= 0}
              >
                수동 저장
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">실시간 환율 API 오류 시 수동 환율이 사용됩니다.</div>
          </div>
          {/* (중) 세금 옵션 */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow p-6 flex flex-col gap-2 items-center justify-center">
            <h2 className="text-lg font-semibold mb-2">세금 옵션</h2>
            <input
              type="number"
              className="border rounded px-3 py-2 w-32 dark:bg-gray-900 dark:text-white"
              placeholder="배당세율(%)"
              value={taxRate}
              onChange={handleTaxRateChange}
            />
            <span className="ml-2 text-gray-500 text-xs">(예: 15)</span>
          </div>
          {/* (우) 초기화 */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow p-6 flex flex-col gap-2 items-center justify-center">
            <h2 className="text-lg font-semibold mb-2">초기화</h2>
            <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500" disabled>
              초기화
            </button>
            <span className="ml-2 text-gray-500 text-xs">(모든 설정 초기화, 기능은 추후 구현)</span>
          </div>
        </div>
      </section>
    </div>
  );
} 