import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg min-w-[900px] w-auto p-6 relative animate-fadeIn">
        <button
          className="absolute top-3 right-3 text-neutral-400 hover:text-red-500 text-xl font-bold"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        {title && <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
} 