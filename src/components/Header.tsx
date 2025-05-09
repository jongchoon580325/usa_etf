import React from 'react';

export default function Header() {
  return (
    <header className="w-full bg-gray-900 text-white dark:bg-gray-900 dark:text-white px-4 py-3 flex items-center justify-between shadow">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg">미국주식 ETF 월배당 포트폴리오</span>
        <nav className="flex gap-4">
          <a href="/" className="hover:underline">대시보드</a>
          <a href="/portfolio" className="hover:underline">포트폴리오</a>
          <a href="/search" className="hover:underline">ETF 검색</a>
          <a href="/settings" className="hover:underline">설정</a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {/* 다크/라이트 모드 토글 (기능은 추후 구현) */}
        <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">다크/라이트</button>
        {/* 저장/불러오기 메뉴 (기능은 추후 구현) */}
        <button className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600">저장</button>
        <button className="px-2 py-1 rounded bg-green-700 hover:bg-green-600">불러오기</button>
      </div>
    </header>
  );
} 