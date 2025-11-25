import React from 'react';
import { createPortal } from 'react-dom';

interface GameModeSelectorProps {
  isOpen: boolean;
  onSelectMode: (mode: 'random' | 'solvable' | 'unsolvable') => void;
  onClose: () => void;
}

export function GameModeSelector({ isOpen, onSelectMode, onClose }: GameModeSelectorProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ zIndex: 100000 }}>
      <div className="bg-green-900 border-4 border-amber-700 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl" style={{ zIndex: 100001 }}>
        <h2 className="text-2xl font-bold text-amber-100 mb-6 text-center">
          Выберите режим игры
        </h2>
        
        <div className="space-y-4">
          {/* Random Mode */}
          <button
            onClick={() => {
              onSelectMode('random');
              onClose();
            }}
            className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg border-2 border-amber-600 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="text-left">
              <div className="text-xl mb-1">🎲 Случайная раздача</div>
              <div className="text-sm text-amber-200 opacity-90">
                Классический режим, ~80% раскладок решаемы
              </div>
            </div>
          </button>
          
          {/* Solvable Mode */}
          <button
            onClick={() => {
              onSelectMode('solvable');
              onClose();
            }}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white font-semibold py-4 px-6 rounded-lg border-2 border-amber-500 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="text-left">
              <div className="text-xl mb-1">✅ Гарантированно решаемая</div>
              <div className="text-sm text-amber-100 opacity-90">
                100% раскладываемая раздача
              </div>
            </div>
          </button>
          
          {/* Unsolvable Mode */}
          <button
            onClick={() => {
              onSelectMode('unsolvable');
              onClose();
            }}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-lg border-2 border-red-500 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="text-left">
              <div className="text-xl mb-1">❌ Невозможная раскладка</div>
              <div className="text-sm text-red-100 opacity-90">
                100% не решается, для тренировки
              </div>
            </div>
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full text-amber-300 hover:text-amber-100 py-2 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>,
    document.body
  );
}

