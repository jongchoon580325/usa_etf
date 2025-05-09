'use client';

import { useState } from 'react';

// 샘플 ETF 데이터
const ETF_LIST = [
  { ticker: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', months: '3, 6, 9, 12', yield: 3.5 },
  { ticker: 'JEPI', name: 'JPMorgan Equity Premium Income ETF', months: '매월', yield: 7.8 },
  { ticker: 'VYM', name: 'Vanguard High Dividend Yield ETF', months: '3, 6, 9, 12', yield: 3.2 },
  { ticker: 'SPHD', name: 'Invesco S&P 500 High Dividend Low Volatility ETF', months: '매월', yield: 4.6 },
  { ticker: 'DHS', name: 'WisdomTree U.S. High Dividend Fund', months: '3, 6, 9, 12', yield: 3.8 },
  { ticker: 'QYLD', name: 'Global X NASDAQ 100 Covered Call ETF', months: '매월', yield: 11.9 },
];

export default function EtfSearchPage() {
  const [query, setQuery] = useState('');

  // 검색 필터
  const filtered = ETF_LIST.filter(
    etf =>
      etf.ticker.toLowerCase().includes(query.toLowerCase()) ||
      etf.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ETF 검색</h1>
      <section className="bg-white dark:bg-gray-800 rounded shadow p-6">
        <input
          type="text"
          className="border rounded px-3 py-2 w-full max-w-md mb-6 dark:bg-gray-900 dark:text-white"
          placeholder="ETF 이름 또는 티커로 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-4 py-2">티커</th>
                <th className="px-4 py-2">이름</th>
                <th className="px-4 py-2">분배월</th>
                <th className="px-4 py-2">배당률(%)</th>
                <th className="px-4 py-2">추가</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map(etf => (
                  <tr key={etf.ticker} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2 font-semibold">{etf.ticker}</td>
                    <td className="px-4 py-2">{etf.name}</td>
                    <td className="px-4 py-2">{etf.months}</td>
                    <td className="px-4 py-2">{etf.yield}</td>
                    <td className="px-4 py-2">
                      <button
                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-400"
                        disabled
                      >
                        포트폴리오에 추가
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
} 