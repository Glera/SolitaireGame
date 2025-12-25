import React from 'react';

interface NoMovesModalProps {
  isVisible: boolean;
  onNewGame: () => void;
  onClose: () => void;
}

export function NoMovesModal({ isVisible, onNewGame, onClose }: NoMovesModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - no click handler, only buttons close the modal */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-600 max-w-sm mx-4 animate-fade-in">
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🤔</div>
          <h2 className="text-xl font-bold text-white mb-2">Нет доступных ходов</h2>
          <p className="text-slate-300 text-sm">
            К сожалению, эта раскладка не может быть решена. Попробуй новую!
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onNewGame}
            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Новая раскладка
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-all duration-200"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}


