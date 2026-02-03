import React, { useState, useEffect } from 'react';

interface NoMovesModalProps {
  isVisible: boolean;
  jokerCount: number;
  winStreak: number;
  winMultiplier: number;
  onNewGame: () => void;
  onUseJoker: () => void;
}

export function NoMovesModal({ 
  isVisible, 
  jokerCount, 
  winStreak,
  winMultiplier,
  onNewGame, 
  onUseJoker 
}: NoMovesModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset confirmation state when modal becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setShowConfirmation(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleGiveUp = () => {
    // If player has streak >= 2, show confirmation
    if (winMultiplier >= 2) {
      setShowConfirmation(true);
    } else {
      onNewGame();
    }
  };

  const handleConfirmGiveUp = () => {
    setShowConfirmation(false);
    onNewGame();
  };

  const handleCancelGiveUp = () => {
    setShowConfirmation(false);
  };

  // Confirmation dialog for losing streak
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" />
        
        {/* Modal */}
        <div 
          className="relative bg-gradient-to-br from-red-900 to-slate-900 rounded-2xl p-6 shadow-2xl border border-red-500/50 max-w-sm mx-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Warning Icon */}
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Потеря серии побед!</h2>
            <p className="text-slate-300 text-sm mb-2">
              У тебя серия из <span className="text-amber-400 font-bold">{winStreak} побед</span> с множителем <span className="text-amber-400 font-bold">x{winMultiplier}</span>!
            </p>
            <p className="text-red-300 text-sm">
              Если сдашься, серия сбросится и награда за следующую победу вернётся к минимуму.
            </p>
          </div>
          
          {/* Buttons in a row */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirmGiveUp}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all duration-200"
            >
              Сдаться
            </button>
            <button
              onClick={handleCancelGiveUp}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Modal */}
      <div 
        className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-600 max-w-sm mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Joker Icon in center */}
        <div className="text-center mb-4">
          <div className="text-7xl mb-3">🃏</div>
          <h2 className="text-xl font-bold text-white mb-2">Нет доступных ходов</h2>
          <p className="text-slate-300 text-sm">
            Используй Джокер чтобы продолжить игру
          </p>
        </div>
        
        {/* Two buttons in a row */}
        <div className="flex gap-3">
          <button
            onClick={handleGiveUp}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all duration-200"
          >
            Сдаться
          </button>
          
          <button
            onClick={onUseJoker}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
