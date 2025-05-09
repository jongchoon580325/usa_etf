"use client";

import { FaHome, FaTable, FaTools } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MenuBar() {
  const pathname = usePathname();
  return (
    <header className="w-full border-b border-dashed border-neutral-700 bg-neutral-900/90 shadow-lg sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-amber-400 drop-shadow-sm">
            🍀 Dividend ETF Portfolio
          </span>
        </div>
        <ul className="flex gap-6 text-lg font-medium">
          <li>
            <Link
              href="/"
              className={`flex items-center gap-2 transition-colors ${
                pathname === "/" ? "text-amber-400 font-extrabold" : "hover:text-amber-400"
              }`}
            >
              <FaHome /> 홈
            </Link>
          </li>
          <li>
            <Link
              href="/portfolio"
              className={`flex items-center gap-2 transition-colors ${
                pathname.startsWith("/portfolio") ? "text-amber-400 font-extrabold" : "hover:text-amber-400"
              }`}
            >
              <FaTable /> 포트폴리오
            </Link>
          </li>
          <li>
            <Link
              href="/search"
              className={`flex items-center gap-2 transition-colors ${
                pathname.startsWith("/search") ? "text-amber-400 font-extrabold" : "hover:text-amber-400"
              }`}
            >
              <FaTools /> 자료관리
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
} 