import React, { useState } from 'react';
import Modal from '../components/Modal';
import { PortfolioStatus } from '../portfolio/PortfolioStatusManager';

interface PortfolioListProps {
  statusList: PortfolioStatus[];
  onDeleteStatus: (id: string) => void;
  onRenameStatus: (id: string, newName: string) => void;
  effectiveRate: number;
  taxRate: number;
}

export default function PortfolioList({ statusList, onDeleteStatus, onRenameStatus, effectiveRate, taxRate }: PortfolioListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<PortfolioStatus | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleView = (status: PortfolioStatus) => {
    setModalData(status);
    setModalOpen(true);
  };

  const handleEdit = (idx: number, name: string) => {
    setEditIdx(idx);
    setEditName(name);
  };

  const handleEditSave = (idx: number, id: string) => {
    if (onRenameStatus) onRenameStatus(id, editName);
    setEditIdx(null);
    setEditName('');
  };

  const handleEditCancel = () => {
    setEditIdx(null);
    setEditName('');
  };

  if (!statusList || statusList.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-2">포트폴리오 현황</h2>
      <div className="bg-neutral-900 rounded-lg p-4">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-neutral-800 text-neutral-300">
              <th className="px-3 py-2 text-center">이름</th>
              <th className="px-3 py-2 text-center">날짜</th>
              <th className="px-3 py-2 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {statusList.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-neutral-500">저장된 포트폴리오 현황이 없습니다.</td>
              </tr>
            ) : (
              statusList.map((item, idx) => (
                <tr key={item.id} className="border-b border-neutral-800">
                  <td className="px-3 py-2 text-center font-semibold text-emerald-300">
                    {editIdx === idx ? (
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-32 bg-neutral-950 text-white"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{new Date(item.date).toLocaleString('ko-KR')}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      {editIdx === idx ? (
                        <>
                          <button className="px-2 py-1 rounded bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600" onClick={() => handleEditSave(idx, item.id)} type="button">저장</button>
                          <button className="px-2 py-1 rounded bg-neutral-700 text-white text-xs font-bold hover:bg-neutral-600" onClick={handleEditCancel} type="button">취소</button>
                        </>
                      ) : (
                        <>
                          <button className="px-2 py-1 rounded bg-blue-800 text-white text-xs font-bold hover:bg-blue-600" onClick={() => handleEdit(idx, item.name)} type="button">이름변경</button>
                          <button className="px-2 py-1 rounded bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600" onClick={() => handleView(item)} type="button">보기</button>
                          <button className="px-2 py-1 rounded bg-red-800 text-white text-xs font-bold hover:bg-red-600" onClick={() => onDeleteStatus(item.id)} type="button">삭제</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalData?.name || '포트폴리오 현황'}>
        {modalData && (
          <div>
            <div className="text-xs text-neutral-400 mb-2">저장일시: {new Date(modalData.date).toLocaleString('ko-KR')}</div>
            <table className="w-full text-sm text-left mb-2 min-w-[900px]">
              <thead>
                <tr className="bg-neutral-800 text-neutral-300">
                  <th className="px-2 py-1 text-center">ETF명</th>
                  <th className="px-2 py-1 text-center">현재주가</th>
                  <th className="px-2 py-1 text-center">수량</th>
                  <th className="px-2 py-1 text-center">달러투자금</th>
                  <th className="px-2 py-1 text-center">비중</th>
                  <th className="px-2 py-1 text-center">월배당금</th>
                  <th className="px-2 py-1 text-center">배당률</th>
                  <th className="px-2 py-1 text-center">원화배당금</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const safeRate = effectiveRate && effectiveRate > 0 ? effectiveRate : 1;
                  const safeTax = taxRate !== undefined ? taxRate : 0;
                  const totalInvest = modalData.data.reduce((sum, item) => sum + item.invest, 0);
                  const totalMonthDivUsd = modalData.data.reduce((sum, item) => sum + (Number(item.dividend) * item.quantity), 0);
                  const totalMonthDivKrw = modalData.data.reduce((sum, item) => sum + ((Number(item.dividend) * item.quantity) * safeRate * (1 - safeTax / 100)), 0);
                  const totalDividendYield = totalInvest > 0 ? ((totalMonthDivUsd / totalInvest) * 100).toFixed(2) : '0.00';
                  return (
                    <>
                      {modalData.data.map((item: any, idx: number) => {
                        const monthDivUsd = Number(item.dividend) * item.quantity;
                        const percent = totalInvest ? ((item.invest / totalInvest) * 100).toFixed(1) : '-';
                        const dividendYield = item.invest > 0 ? ((monthDivUsd / item.invest) * 100).toFixed(2) : '0.00';
                        const monthDivKrw = monthDivUsd * safeRate * (1 - safeTax / 100);
                        return (
                          <tr key={item.ticker + idx} className="border-b border-neutral-800">
                            <td className="px-2 py-1 text-center font-semibold text-emerald-300">{item.ticker}</td>
                            <td className="px-2 py-1 text-center">${Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-2 py-1 text-center">{Number(item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-2 py-1 text-center">${Number(item.invest).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-2 py-1 text-center">{percent}%</td>
                            <td className="px-2 py-1 text-center">${monthDivUsd ? Math.round(monthDivUsd).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                            <td className="px-2 py-1 text-center">{dividendYield}%</td>
                            <td className="px-2 py-1 text-center">₩{monthDivKrw ? Math.round(monthDivKrw).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-neutral-800 text-yellow-300 font-bold border-t-2 border-yellow-400">
                        <td className="px-2 py-1 text-center">합계</td>
                        <td className="px-2 py-1 text-center"></td>
                        <td className="px-2 py-1 text-center">{modalData.data.reduce((sum, item) => sum + Number(item.quantity), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-2 py-1 text-center">${modalData.data.reduce((sum, item) => sum + Number(item.invest), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="px-2 py-1 text-center">{totalInvest > 0 ? '100.0%' : '-'}</td>
                        <td className="px-2 py-1 text-center">${totalMonthDivUsd ? Math.round(totalMonthDivUsd).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                        <td className="px-2 py-1 text-center">{totalDividendYield}%</td>
                        <td className="px-2 py-1 text-center">₩{totalMonthDivKrw ? Math.round(totalMonthDivKrw).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            <button
              className="w-full mt-2 px-4 py-2 rounded bg-neutral-700 text-white font-bold hover:bg-neutral-600"
              onClick={() => setModalOpen(false)}
            >닫기</button>
          </div>
        )}
      </Modal>
    </section>
  );
} 