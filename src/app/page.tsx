import { FaChartPie } from 'react-icons/fa';

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2 mt-8">
        <FaChartPie className="text-5xl text-amber-400 drop-shadow-lg" />
        <h1 className="text-3xl font-extrabold tracking-tight mt-2">대시보드</h1>
        <p className="text-lg text-neutral-400 mt-2 text-center max-w-xl">
          ETF 월배당 현황과 투자 요약을 한눈에!
        </p>
        <div className="w-full max-w-2xl border-t border-dashed border-neutral-700 my-8" />
      </div>
    </section>
  );
}
