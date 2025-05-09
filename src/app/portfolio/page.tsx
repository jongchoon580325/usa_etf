'use client';

import { FaWallet } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { getEffectiveExchangeRate } from '../../components/exchangeRateUtil';
import PortfolioList from '../search/PortfolioList';
import { PortfolioStatus } from '../portfolio/PortfolioStatusManager';
import yahooFinance from 'yahoo-finance2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export default function PortfolioPage() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState<{ ticker: string; price: number; dividend: number }[]>([]);
  const [selected, setSelected] = useState<null | { ticker: string; price: number; dividend: number }>(null);
  const [quantity, setQuantity] = useState(0);
  const [userTotalInvestment, setUserTotalInvestment] = useState<number | ''>('');
  const [portfolio, setPortfolio] = useState<{
    ticker: string;
    price: number;
    quantity: number;
    dividend: number;
    invest: number;
    monthlyDividend: number;
  }[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1400);
  const [rateSource, setRateSource] = useState<'realtime'|'manual'|null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [dividendInput, setDividendInput] = useState('');
  const [saveName, setSaveName] = useState('');
  const [statusList, setStatusList] = useState<PortfolioStatus[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [tickerToast, setTickerToast] = useState<{ ticker: string; message: string } | null>(null);
  const [tickerInfoList, setTickerInfoList] = useState<{ ticker: string; price: number | null; dividend: number | null }[]>([]);
  const getPriceValue = () => priceInput.replace(/,/g, '');
  const priceInputRef = useRef<HTMLInputElement>(null);

  // 포트폴리오 데이터 저장/불러오기 (indexedDB + localStorage)
  const DB_NAME = 'etfPortfolioDB';
  const STORE_NAME = 'portfolio';
  const TICKER_STORE = 'tickers';

  function ensureStores(db: IDBDatabase) {
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    if (!db.objectStoreNames.contains(TICKER_STORE)) db.createObjectStore(TICKER_STORE);
  }

  function savePortfolioData(data: any) {
    localStorage.setItem('portfolio', JSON.stringify(data));
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, 'portfolio');
        tx.oncomplete = () => db.close();
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            savePortfolioData(data);
          };
        } else {
          db.close();
        }
      }
    };
  }
  function loadPortfolioData(cb: (data: any) => void) {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(STORE_NAME, 'readonly');
        const getReq = tx.objectStore(STORE_NAME).get('portfolio');
        getReq.onsuccess = () => {
          if (getReq.result) cb(getReq.result);
          else {
            const local = localStorage.getItem('portfolio');
            if (local) cb(JSON.parse(local));
          }
          db.close();
        };
        getReq.onerror = () => {
          const local = localStorage.getItem('portfolio');
          if (local) cb(JSON.parse(local));
          db.close();
        };
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            loadPortfolioData(cb);
          };
        } else {
          db.close();
        }
      }
    };
  }
  // 저장 시 자동 반영
  useEffect(() => {
    if (portfolio.length > 0) savePortfolioData(portfolio);
  }, [portfolio]);
  // 마운트 시 자동 불러오기
  useEffect(() => {
    loadPortfolioData((data) => {
      if (Array.isArray(data)) setPortfolio(data);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    setRateLoading(true);
    (async () => {
      const eff = await getEffectiveExchangeRate();
      if (!mounted) return;
      setExchangeRate(eff.rate && eff.rate > 0 ? eff.rate : 0);
      setRateSource(eff.source);
      setRateLoading(false);
      setRateError(!eff.rate);
    })();
    return () => { mounted = false; };
  }, []);

  // 티커명 입력값 대문자 변환
  const handleTickerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value.toUpperCase());
  };

  // 티커 등록 시 실시간 데이터 fetch (API Route 사용)
  const fetchTickerInfo = async (ticker: string) => {
    try {
      const res = await fetch(`/api/ticker-info?ticker=${ticker}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyApp/1.0; +https://yourdomain.com)'
        }
      });
      const data = await res.json();
      setTickerInfoList(prev => [...prev, { ticker, price: data.price, dividend: data.dividend }]);
    } catch (e) {
      setTickerInfoList(prev => [...prev, { ticker, price: null, dividend: null }]);
    }
  };

  // 티커 저장
  const handleSaveTicker = async () => {
    const ticker = query.trim().toUpperCase();
    if (!ticker || tickers.find(t => t.ticker === ticker)) return;
    if (tickers.length >= 12) {
      setToast('더 이상 등록할 수 없습니다.');
      return;
    }
    const newTicker = { ticker, price: 0, dividend: 0 };
    const next = [...tickers, newTicker];
    setTickers(next);
    setSelected(newTicker);
    saveTickersData(next);
    setQuery('');
    // 실시간 데이터 fetch
    await fetchTickerInfo(ticker);
  };

  // 티커 삭제
  const handleDeleteTicker = (ticker: string) => {
    setTickers(prev => {
      const next = prev.filter(t => t.ticker !== ticker);
      saveTickersData(next);
      return next;
    });
    setTickerInfoList(prev => prev.filter(info => info.ticker !== ticker));
    if (selected?.ticker === ticker) setSelected(null);
  };

  // 티커 선택
  const filtered = tickers;

  // 개별 ETF 투자금액
  const price = priceInput === '' || priceInput === '.' ? 0 : parseFloat(getPriceValue());
  const invest = price * quantity;
  const krwInvestment = invest * exchangeRate;
  const monthlyDividend = dividendInput && quantity > 0 ? Number(dividendInput) * quantity : 0;

  // 합계
  const totalQty = portfolio.reduce((sum, item) => sum + item.quantity, 0);
  const totalKrw = portfolio.reduce((sum, item) => sum + item.invest * exchangeRate, 0);
  const totalDiv = portfolio.reduce((sum, item) => sum + item.dividend * item.quantity, 0);
  const totalInvest = typeof userTotalInvestment === 'number' ? userTotalInvestment : 0;
  const totalWeight = portfolio.reduce((sum, item) => {
    return sum + (totalInvest ? item.invest / totalInvest : 0);
  }, 0);

  // 남은 비중 계산 (100% - 현재 비중)
  const remainWeight = Math.max(0, 1 - totalWeight);
  const remainWeightPercent = (remainWeight * 100).toFixed(1);
  const isOverWeight = totalWeight > 1;
  const usedInvestment = portfolio.reduce((sum, item) => sum + item.invest, 0);
  const remainInvestment = Math.max(0, totalInvest - usedInvestment);

  // 데이터 추가 제한
  const canAdd = !isOverWeight && !!selected && quantity > 0 && totalInvest > 0 && invest > 0 && invest <= totalInvest;

  // 저장
  const handleAdd = () => {
    if (selected && quantity > 0 && userTotalInvestment && invest > 0 && canAdd) {
      setPortfolio(prev => [
        ...prev,
        {
          ticker: selected.ticker,
          price: priceInput === '' || priceInput === '.' ? 0 : parseFloat(priceInput),
          quantity,
          dividend: dividendInput === '' || dividendInput === '.' ? 0 : parseFloat(dividendInput),
          invest,
          monthlyDividend: dividendInput && quantity > 0 ? Number(dividendInput) * quantity : 0,
        },
      ]);
      handleReset();
    }
  };

  // 입력 초기화 함수
  const handleReset = () => {
    setSelected(null);
    setPriceInput('');
    setDividendInput('');
    setQuantity(0);
  };

  // 입력 핸들러 (천단위 콤마)
  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 숫자/소숫점만 허용, 콤마 제거 후 콤마 추가
    let raw = e.target.value.replace(/,/g, '');
    if (/^(0|[1-9]\d*)?(\.\d*)?$/.test(raw)) {
      // 콤마 추가
      const parts = raw.split('.');
      let intPart = parts[0];
      let decPart = parts[1] !== undefined ? '.' + parts[1] : '';
      intPart = intPart ? parseInt(intPart, 10).toLocaleString() : '';
      setPriceInput(intPart + decPart);
    }
  };

  // handleDividendInput: 0으로 시작하는 소숫점 입력 허용, 문자열 상태 유지
  const handleDividendInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDividendInput(e.target.value);
  };

  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    setQuantity(raw === '' ? 0 : Number(raw));
  };
  const quantityDisplay = quantity > 0 ? quantity.toLocaleString() : '';

  // 총 투자금액 입력값 천단위 콤마 표시
  const handleTotalInvestmentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '') {
      setUserTotalInvestment('');
      localStorage.removeItem('userTotalInvestment');
    } else {
      setUserTotalInvestment(Number(raw));
      localStorage.setItem('userTotalInvestment', raw);
    }
  };
  const totalInvestmentDisplay = userTotalInvestment === '' || isNaN(Number(userTotalInvestment)) ? '' : Number(userTotalInvestment).toLocaleString();

  // 총 투자금액 원화 환산
  const totalInvestmentKrw = userTotalInvestment && exchangeRate ? userTotalInvestment * exchangeRate : 0;

  // 테이블 뷰: 현재주가, 주당월배당 합계
  const totalPrice = portfolio.reduce((sum, item) => sum + item.price, 0);
  const totalDividend = Number(portfolio.reduce((sum, item) => sum + item.dividend, 0).toFixed(4));

  // 인라인 편집 상태 관리
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<any>(null);

  const handleEditPortfolio = (idx: number) => {
    setEditIdx(idx);
    setEditRow({ ...portfolio[idx] });
  };
  const handleEditRowChange = (field: string, value: string) => {
    setEditRow((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleEditSave = (idx: number) => {
    setPortfolio(prev => prev.map((item, i) => i === idx ? {
      ...item,
      price: Number(editRow.price),
      quantity: Number(editRow.quantity),
      dividend: Number(editRow.dividend),
      invest: Number(editRow.price) * Number(editRow.quantity),
      monthlyDividend: Number(editRow.dividend) * quantity,
    } : item));
    setEditIdx(null);
    setEditRow(null);
  };
  const handleEditCancel = () => {
    setEditIdx(null);
    setEditRow(null);
  };

  const handleDeletePortfolio = (idx: number) => {
    setPortfolio(prev => prev.filter((_, i) => i !== idx));
  };

  // 안내문구 상태 계산
  const getGuideText = () => {
    if (!selected) return '현재 주가를 입력하세요.';
    if (!priceInput || priceInput === '0') return '현재 주가를 입력하세요.';
    if (!quantity || quantity === 0) return '수량을 입력하세요.';
    if (!dividendInput || dividendInput === '0') return '주당 월배당을 입력하세요.';
    return '엔터 혹은 데이터 저장을 클릭하세요.';
  };

  // 티커 데이터 저장/불러오기 (indexedDB + localStorage)
  function saveTickersData(data: any) {
    console.log('[saveTickersData] 저장 시도:', data);
    localStorage.setItem('tickers', JSON.stringify(data));
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(TICKER_STORE, 'readwrite');
        tx.objectStore(TICKER_STORE).put(data, 'tickers');
        tx.oncomplete = () => {
          console.log('[saveTickersData] IndexedDB 저장 완료:', data);
          db.close();
        };
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            saveTickersData(data);
          };
        } else {
          db.close();
        }
      }
    };
  }
  function loadTickersData(cb: (data: any) => void) {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(TICKER_STORE, 'readonly');
        const getReq = tx.objectStore(TICKER_STORE).get('tickers');
        getReq.onsuccess = () => {
          console.log('[loadTickersData] 불러온 값:', getReq.result);
          if (getReq.result) cb(getReq.result);
          else {
            const local = localStorage.getItem('tickers');
            if (local) cb(JSON.parse(local));
          }
          db.close();
        };
        getReq.onerror = () => {
          const local = localStorage.getItem('tickers');
          if (local) cb(JSON.parse(local));
          db.close();
        };
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            loadTickersData(cb);
          };
        } else {
          db.close();
        }
      }
    };
  }
  // 티커 저장/삭제 시 자동 반영
  useEffect(() => {
    if (tickers.length > 0) {
      saveTickersData(tickers);
    }
  }, [tickers]);
  // 마운트 시 자동 불러오기
  useEffect(() => {
    loadTickersData((data) => {
      console.log('[useEffect-loadTickersData] 마운트 시 불러온 값:', data);
      if (Array.isArray(data) && data.length > 0) {
        setTickers(data);
      }
    });
  }, []);

  // 포트폴리오 전체 초기화
  const handlePortfolioReset = () => {
    setPortfolio([]);
    localStorage.removeItem('portfolio');
    setTickers([]);
    localStorage.removeItem('tickers');
    setUserTotalInvestment('');
    localStorage.removeItem('userTotalInvestment');
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete('portfolio');
        tx.oncomplete = () => db.close();
      } else {
        db.close();
      }
    };
  };

  // 현황 저장/불러오기 함수
  const STATUS_DB_KEY = 'portfolioStatusList';
  function loadStatusList(): PortfolioStatus[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STATUS_DB_KEY);
    return saved ? JSON.parse(saved) : [];
  }
  function saveStatusList(list: PortfolioStatus[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STATUS_DB_KEY, JSON.stringify(list));
  }
  // 현황 저장 버튼 핸들러
  const handleSaveStatus = () => {
    if (!portfolio || portfolio.length === 0) return;
    // 환율/세금옵션 불러오기 (여러 키 fallback)
    const eff = localStorage.getItem('effectiveRate');
    const manual = localStorage.getItem('manualRate');
    const real = localStorage.getItem('realtimeRate');
    const effectiveRate = eff ? Number(eff) : manual ? Number(manual) : real ? Number(real) : exchangeRate;
    const taxRate = localStorage.getItem('taxRate') ? Number(localStorage.getItem('taxRate')) : 0;
    // 각 ETF별 원화 배당금 계산
    const portfolioWithKrwDiv = portfolio.map(item => ({
      ...item,
      krwDividend: Number(item.dividend) * effectiveRate * (1 - taxRate / 100)
    }));
    const name = saveName.trim() || `포트폴리오(${new Date().toLocaleString('ko-KR')})`;
    const newStatus: PortfolioStatus = {
      id: Date.now().toString(),
      name,
      date: new Date().toISOString(),
      data: portfolioWithKrwDiv,
    };
    const next = [newStatus, ...statusList].slice(0, 10);
    setStatusList(next);
    saveStatusList(next);
    setSaveName('');
  };
  // 현황 리스트 불러오기 (마운트 시)
  useEffect(() => {
    setStatusList(loadStatusList());
  }, []);

  // handleDeleteStatus 함수 추가
  const handleDeleteStatus = (id: string) => {
    const next = statusList.filter(s => s.id !== id);
    setStatusList(next);
    saveStatusList(next);
  };

  // 현황 이름변경 함수 추가
  const handleRenameStatus = (id: string, newName: string) => {
    const next = statusList.map(s => s.id === id ? { ...s, name: newName } : s);
    setStatusList(next);
    saveStatusList(next);
  };

  // 환율, 세금옵션 불러오기
  const getEffectiveRate = () => {
    if (typeof window === 'undefined') return 0;
    const eff = localStorage.getItem('effectiveRate');
    return eff ? Number(eff) : exchangeRate;
  };
  const getTaxRate = () => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('taxRate');
    return saved ? Number(saved) : 0;
  };
  const effectiveRate = getEffectiveRate();
  const taxRate = getTaxRate();

  // 원화 배당금 합계
  const totalKrwDiv = portfolio.reduce(
    (sum, item) => sum + (Number(item.dividend) * effectiveRate * (1 - taxRate / 100)),
    0
  );

  // 마운트 시 localStorage에서 총 투자금액 불러오기
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('userTotalInvestment') : null;
    if (saved && !isNaN(Number(saved))) {
      setUserTotalInvestment(Number(saved));
    }
  }, []);

  // Toast 자동 사라짐
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Toast 자동 사라짐
  useEffect(() => {
    if (tickerToast) {
      const timer = setTimeout(() => setTickerToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [tickerToast]);

  // 티커명 정보 저장/불러오기 (indexedDB + localStorage)
  function saveTickerInfoList(data: any) {
    localStorage.setItem('tickerInfoList', JSON.stringify(data));
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(TICKER_STORE, 'readwrite');
        tx.objectStore(TICKER_STORE).put(data, 'tickerInfoList');
        tx.oncomplete = () => db.close();
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            saveTickerInfoList(data);
          };
        } else {
          db.close();
        }
      }
    };
  }
  function loadTickerInfoList(cb: (data: any) => void) {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      ensureStores(req.result);
    };
    req.onsuccess = () => {
      const db = req.result;
      let tx;
      try {
        tx = db.transaction(TICKER_STORE, 'readonly');
        const getReq = tx.objectStore(TICKER_STORE).get('tickerInfoList');
        getReq.onsuccess = () => {
          if (getReq.result) cb(getReq.result);
          else {
            const local = localStorage.getItem('tickerInfoList');
            if (local) cb(JSON.parse(local));
          }
          db.close();
        };
        getReq.onerror = () => {
          const local = localStorage.getItem('tickerInfoList');
          if (local) cb(JSON.parse(local));
          db.close();
        };
      } catch (e: any) {
        if (e.name === 'NotFoundError') {
          db.close();
          window.indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
            loadTickerInfoList(cb);
          };
        } else {
          db.close();
        }
      }
    };
  }
  // 저장 시 자동 반영
  useEffect(() => {
    saveTickerInfoList(tickerInfoList);
  }, [tickerInfoList]);
  // 마운트 시 자동 불러오기
  useEffect(() => {
    loadTickerInfoList((data) => {
      if (Array.isArray(data)) {
        setTickerInfoList(data);
      } else {
        setTickerInfoList([]);
      }
    });
  }, []);

  // 포트폴리오 차트 데이터 준비
  const chartData = [...portfolio]
    .map(item => ({
      ticker: item.ticker,
      weight: totalInvest > 0 ? Number(((item.invest / totalInvest) * 100).toFixed(1)) : 0,
      monthlyDividend: Math.round(Number(item.dividend) * item.quantity),
    }))
    .sort((a, b) => b.monthlyDividend - a.monthlyDividend);

  return (
    <section className="flex flex-col items-center gap-8 relative">
      {/* Toast 안내창 */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-neutral-900/90 text-white text-base font-semibold rounded-xl shadow-lg border border-emerald-400 animate-fade-in-out transition-all">
          {toast}
        </div>
      )}
      {/* 상단 입력 UI */}
      <div className="flex flex-col w-full max-w-5xl bg-neutral-900 rounded-lg shadow p-6 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* 왼쪽: 투자금 포트폴리오 */}
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-bold mb-2 text-emerald-300">투자금 포트폴리오</h3>
            <div className="flex flex-col gap-4 flex-1">
              {/* 상세 입력란 전체를 <form>으로 감싸고, onSubmit에서 handleAdd 호출 */}
              <form className="flex flex-col gap-4 flex-1" onSubmit={e => { e.preventDefault(); handleAdd(); }}>
                {/* 1단: ETF 티커명 입력 필드 */}
                <div className="flex flex-row gap-4 items-center relative">
                  {tickerToast && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-neutral-900 text-emerald-200 text-sm rounded shadow border border-emerald-400 z-50 animate-fade-in-out whitespace-nowrap">
                      {tickerToast.message}
                    </span>
                  )}
                  <input
                    type="text"
                    className="border rounded px-3 py-2 w-1/2 bg-neutral-950 text-white"
                    placeholder="ETF 티커명 입력 (예: SCHD)"
                    value={query}
                    onChange={handleTickerInput}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTicker();
                      }
                    }}
                  />
                  <span className="text-xs ml-2" style={{ color: '#ffe066' }}>티커 검색 후 클릭하여 선택하세요!</span>
                </div>
                {/* 2단: 티커명 등록 박스 */}
                <div className="bg-neutral-800 rounded-[10px] p-2 min-h-[44px] max-h-[76px] overflow-y-hidden flex flex-row flex-wrap gap-1 mt-1 w-full max-w-full" style={{minHeight:'44px', maxHeight:'76px', overflowY:'hidden'}}>
                  {filtered.length > 0 ? (
                    filtered.map(etf => (
                      <div key={etf.ticker} className="flex items-center gap-0.5">
                        <button
                          className={`px-2 py-1 rounded font-bold border text-xs md:text-sm ${selected?.ticker === etf.ticker ? 'bg-emerald-700 text-white border-emerald-400' : 'bg-neutral-800 text-emerald-300 border-neutral-700'} transition`}
                          style={{ minWidth: '38px' }}
                          onClick={() => {
                            setSelected(etf);
                            setTickerToast({ ticker: etf.ticker, message: `${etf.ticker}를 선택하셨습니다.` });
                          }}
                          type="button"
                        >
                          {etf.ticker}
                        </button>
                        <button
                          className="px-1 py-1 rounded bg-red-800 text-white text-xs font-bold hover:bg-red-600 ml-0.5"
                          style={{ minWidth: '22px', fontSize: '1.1em', lineHeight: 1 }}
                          onClick={() => handleDeleteTicker(etf.ticker)}
                          aria-label="삭제"
                          type="button"
                        >
                          -
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-neutral-500 text-sm">티커명을 입력 후 저장하세요.</span>
                  )}
                </div>
                {/* 3단: 총 투자금액($) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-neutral-400">총 투자금액($)</label>
                    {userTotalInvestment !== '' && userTotalInvestment > 0 && (
                      <span className="text-xs text-emerald-300 ml-2">(₩ 원화 투자금 : {totalInvestmentKrw.toLocaleString()} 원)</span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full bg-neutral-950 text-white"
                    value={totalInvestmentDisplay}
                    onChange={handleTotalInvestmentInput}
                    min={0}
                    inputMode="numeric"
                    pattern="[0-9,]*"
                  />
                </div>
                {/* 4단: (좌) 현재주가($), (우) 수량 */}
                <div className="flex flex-row gap-2 w-full">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">현재주가($)</label>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-neutral-950 text-white"
                      value={priceInput}
                      onChange={handlePriceInput}
                      inputMode="numeric"
                      pattern="[0-9,]*"
                      ref={priceInputRef}
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">수량</label>
                    <input
                      type="text"
                      min={1}
                      className="border rounded px-2 py-1 w-full bg-neutral-950 text-white"
                      value={quantityDisplay}
                      onChange={handleQuantityInput}
                      inputMode="numeric"
                      pattern="[0-9,]*"
                    />
                  </div>
                </div>
                {/* 5단: (좌) 달러 투자금($), (우) 원화 투자금(₩) */}
                <div className="flex flex-row gap-2 w-full">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">달러 투자금($)</label>
                    <input type="text" className="border rounded px-2 py-1 w-full bg-neutral-950 text-white" value={invest ? invest.toLocaleString() : ''} readOnly />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">원화 투자금(₩)</label>
                    <input type="text" className="border rounded px-2 py-1 w-full bg-neutral-950 text-white" value={krwInvestment ? krwInvestment.toLocaleString() : ''} readOnly />
                  </div>
                </div>
                {/* 6단: (좌) 주당 배당금($), (우) 월 배당금($) */}
                <div className="flex flex-row gap-2 w-full">
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">주당 배당금($)</label>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full bg-neutral-950 text-white"
                      value={dividendInput}
                      onChange={handleDividendInput}
                      inputMode="decimal"
                      pattern="[0-9.]*"
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-1/2">
                    <label className="text-xs text-neutral-400">월 배당금($)</label>
                    <input type="text" className="border rounded px-2 py-1 w-full bg-neutral-950 text-white" value={monthlyDividend ? monthlyDividend.toLocaleString() : ''} readOnly />
                  </div>
                </div>
                {/* 7단: (좌) 데이터 저장, (우) 초기화 (3등분, 2:1 비율) */}
                <div className="flex flex-row gap-2 w-full mt-2">
                  <div className="flex flex-col w-2/3">
                    <button
                      type="submit"
                      className="px-6 py-2 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-600 disabled:bg-neutral-700 w-full"
                      disabled={!canAdd}
                    >
                      데이터 저장
                    </button>
                  </div>
                  <div className="flex flex-col w-1/3">
                    <button
                      className="px-6 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-600 w-full"
                      onClick={handleReset}
                      type="button"
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          {/* 오른쪽: 비중 포트폴리오 */}
          <div className="flex flex-col h-full">
            <div className="flex flex-col" style={{flex: 4}}>
              <h3 className="text-lg font-bold mb-2 text-blue-300">티커명 정보</h3>
              <div className="flex-1 flex flex-col items-center justify-start w-full">
                <table className="w-full text-sm text-left mb-2">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-300">
                      <th className="px-3 py-2 text-center">티커명</th>
                      <th className="px-3 py-2 text-center">현재 주가</th>
                      <th className="px-3 py-2 text-center">주당배당금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickerInfoList.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-4 text-neutral-500">데이터 없음</td></tr>
                    ) : (
                      tickerInfoList.map(info => (
                        <tr key={info.ticker}>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-300">{info.ticker}</td>
                          <td className="px-3 py-2 text-center">{info.price !== null ? `$${info.price}` : '-'}</td>
                          <td className="px-3 py-2 text-center">{info.dividend !== null ? `$${info.dividend}` : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col mt-4" style={{flex: 6}}>
              <h3 className="text-lg font-bold mb-2 text-blue-300">포트폴리오 현황</h3>
              <div className="flex-1 flex flex-col items-center justify-center w-full">
                {chartData.length === 0 ? (
                  <div className="text-neutral-400 text-base">(포트폴리오 현황 영역)</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 32, right: 32, left: 32, bottom: 32 }}>
                      <XAxis dataKey="ticker" type="category" tick={{ fill: '#fff', fontWeight: 700 }} />
                      <YAxis type="number" hide />
                      <Legend formatter={(v: string) => v === 'weight' ? '비중(%)' : '월배당($)'} />
                      <Bar dataKey="weight" fill="#60a5fa" barSize={18} radius={[8, 8, 0, 0]}>
                        <LabelList dataKey="weight" position="top" formatter={(v: number) => `${v}%`} fill="#fff" fontWeight={700} />
                      </Bar>
                      <Bar dataKey="monthlyDividend" fill="#facc15" barSize={18} radius={[8, 8, 0, 0]}>
                        <LabelList dataKey="monthlyDividend" position="top" formatter={(v: number) => `${v}$`} fill="#fff" fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 하단: 포트폴리오 테이블 */}
      <div className="w-full max-w-5xl bg-neutral-900 rounded-lg shadow p-6">
        {/* 현황 저장 UI 복구 */}
        <div className="flex gap-2 mt-4 justify-start">
          <input
            type="text"
            className="border rounded px-2 py-1 w-64 bg-neutral-950 text-white"
            placeholder="저장 이름(선택)"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            maxLength={30}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveStatus(); }}
          />
          <button
            className="px-4 py-2 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-600"
            onClick={handleSaveStatus}
            disabled={!portfolio || portfolio.length === 0}
          >
            현황 저장
          </button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">포트폴리오 내역</h2>
          {/* 안내창 inline */}
          {isOverWeight ? (
            <div className="ml-4 p-2 rounded bg-red-900/80 text-red-200 font-bold text-center border border-red-400 shadow min-w-[260px]">
              ⚠️ 비중 합계 100% 초과 (현재: {(totalWeight*100).toFixed(1)}%)
            </div>
          ) : (
            <div className="ml-4 p-2 rounded bg-emerald-900/80 text-emerald-200 font-semibold text-center border border-emerald-400 shadow min-w-[260px]">
              남은 비중: <span className="font-extrabold text-emerald-300">{remainWeightPercent}%</span>
              <span className="ml-2">남은 금액: <span className="font-extrabold text-emerald-200">${remainInvestment.toLocaleString()}</span></span>
            </div>
          )}
        </div>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-neutral-800 text-neutral-300">
              <th className="px-3 py-2 text-center">ETF</th>
              <th className="px-3 py-2 text-center">현재주가</th>
              <th className="px-3 py-2 text-center">수량</th>
              <th className="px-3 py-2 text-center">달러 투자금</th>
              <th className="px-3 py-2 text-center">원화 투자금</th>
              <th className="px-3 py-2 text-center">비중</th>
              <th className="px-3 py-2 text-center">월 배당금</th>
              <th className="px-3 py-2 text-center">배당률</th>
              <th className="px-3 py-2 text-center">원화 배당금</th>
              <th className="px-3 py-2 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-neutral-500">포트폴리오에 추가된 ETF가 없습니다.</td>
              </tr>
            ) : (
              portfolio.map((item, idx) => {
                const krw = item.invest * exchangeRate;
                const totalInvestSum = portfolio.reduce((sum, i) => sum + i.invest, 0);
                const percent = totalInvestSum ? ((item.invest / totalInvestSum) * 100).toFixed(1) : '-';
                const monthDivUsd = Number(item.dividend) * item.quantity;
                const monthDivKrw = Math.round(Number(item.dividend) * item.quantity * effectiveRate * (1 - taxRate / 100));
                // 배당률 계산: (월 배당금 ÷ 달러 투자금) × 100
                const dividendYield = item.invest > 0 ? ((monthDivUsd / item.invest) * 100).toFixed(2) : '0.00';
                const isEditing = editIdx === idx;
                return (
                  <tr key={item.ticker + idx} className="border-b border-neutral-800">
                    <td className="px-3 py-2 text-center font-semibold text-emerald-300">{item.ticker}</td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input type="number" className="w-20 px-1 py-0.5 rounded bg-neutral-950 text-white border" value={editRow.price} onChange={e => handleEditRowChange('price', e.target.value)} />
                      ) : (
                        <>${item.price.toLocaleString()}</>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input type="number" className="w-16 px-1 py-0.5 rounded bg-neutral-950 text-white border" value={editRow.quantity} onChange={e => handleEditRowChange('quantity', e.target.value)} />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input type="number" className="w-20 px-1 py-0.5 rounded bg-neutral-950 text-white border" value={Number(editRow.price) * Number(editRow.quantity)} readOnly />
                      ) : (
                        <>${item.invest.toLocaleString()}</>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">₩{krw.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">{percent}%</td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input type="number" className="w-20 px-1 py-0.5 rounded bg-neutral-950 text-white border" value={editRow.dividend} onChange={e => handleEditRowChange('dividend', e.target.value)} />
                      ) : (
                        <>${monthDivUsd ? Math.round(monthDivUsd).toLocaleString() : 0}</>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{dividendYield}%</td>
                    <td className="px-3 py-2 text-center">₩{monthDivKrw ? monthDivKrw.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        {isEditing ? (
                          <>
                            <button className="px-2 py-1 rounded bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600" onClick={() => handleEditSave(idx)} type="button">저장</button>
                            <button className="px-2 py-1 rounded bg-neutral-700 text-white text-xs font-bold hover:bg-neutral-600" onClick={handleEditCancel} type="button">취소</button>
                          </>
                        ) : (
                          <>
                            <button className="px-2 py-1 rounded bg-blue-800 text-white text-xs font-bold hover:bg-blue-600" onClick={() => handleEditPortfolio(idx)} type="button">수정</button>
                            <button className="px-2 py-1 rounded bg-red-800 text-white text-xs font-bold hover:bg-red-600" onClick={() => handleDeletePortfolio(idx)} type="button">삭제</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* 합계 행 */}
          <tfoot>
            {(() => {
              const totalMonthDivUsd = portfolio.reduce((sum, item) => sum + (Number(item.dividend) * item.quantity), 0);
              const totalMonthDivKrw = portfolio.reduce((sum, item) => sum + Math.round(Number(item.dividend) * item.quantity * effectiveRate * (1 - taxRate / 100)), 0);
              const totalInvestSum = portfolio.reduce((sum, item) => sum + item.invest, 0);
              // 평균(가중평균) 배당률: (합계 월 배당금 ÷ 합계 달러 투자금) × 100
              const totalDividendYield = totalInvestSum > 0 ? ((totalMonthDivUsd / totalInvestSum) * 100).toFixed(2) : '0.00';
              return (
                <tr className="bg-neutral-800 text-yellow-300 font-bold border-t-2 border-yellow-400">
                  <td className="px-3 py-2 text-center">합계</td>
                  <td className="px-3 py-2 text-center"></td>
                  <td className="px-3 py-2 text-center">{totalQty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">${totalInvestSum.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">₩{totalKrw.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">{(totalWeight*100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">${totalMonthDivUsd ? Math.round(totalMonthDivUsd).toLocaleString() : 0}</td>
                  <td className="px-3 py-2 text-center">{totalDividendYield}%</td>
                  <td className="px-3 py-2 text-center">₩{totalMonthDivKrw ? totalMonthDivKrw.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                  <td className="px-3 py-2 text-center">-</td>
                </tr>
              );
            })()}
          </tfoot>
        </table>
        {/* 포트폴리오 현황 저장/리스트/관리 */}
        <PortfolioList statusList={statusList} onDeleteStatus={handleDeleteStatus} onRenameStatus={handleRenameStatus} effectiveRate={effectiveRate} taxRate={taxRate} />
        {/* 하단 우측: 초기화 버튼 */}
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-600"
            onClick={handlePortfolioReset}
            disabled={portfolio.length === 0}
          >
            초기화
          </button>
        </div>
      </div>
    </section>
  );
} 