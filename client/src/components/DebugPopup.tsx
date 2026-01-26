import React from 'react';

export interface DebugInfo {
  title: string;
  position: { x: number; y: number };
  section: string;
  data: Record<string, string | number | boolean>;
}

let debugCallback: ((info: DebugInfo) => void) | null = null;

export function setDebugCallback(callback: (info: DebugInfo) => void) {
  debugCallback = callback;
}

export function showDebugInfo(
  title: string,
  position: { x: number; y: number },
  section: string,
  data: Record<string, string | number | boolean>
) {
  if (debugCallback) {
    debugCallback({ title, position, section, data });
  }
}

interface DebugPopupProps {
  info: DebugInfo | null;
  onClose: () => void;
  onResetDailyQuests?: () => void;
  onResetStars?: () => void;
  onResetCollections?: () => void;
  onResetXP?: () => void;
  onResetAll?: () => void;
  onNewGame?: (mode: 'random' | 'solvable' | 'unsolvable') => void;
}

export function DebugPopup({ info, onClose, onResetDailyQuests, onResetStars, onResetCollections, onResetXP, onResetAll, onNewGame }: DebugPopupProps) {
  if (!info) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      style={{ touchAction: 'none' }}
      onTouchMove={e => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-scrollable]')) {
          e.preventDefault();
        }
      }}
    >
      <div 
        className="bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-md w-full max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <h3 className="text-lg font-bold">{info.title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Scrollable content */}
        <div 
          className="overflow-y-auto flex-1 pr-1"
          data-scrollable
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
          onTouchMove={e => e.stopPropagation()}
        >
        <div className="space-y-2 text-sm font-mono">
          {Object.entries(info.data).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{key}:</span>
              <span className="text-green-400">{String(value)}</span>
            </div>
          ))}
        </div>
        
        {/* New Game buttons */}
        {onNewGame && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Новая игра</h4>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onNewGame('solvable');
                  onClose();
                }}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition-colors"
              >
                ✓ Решаемая
              </button>
              <button
                onClick={() => {
                  onNewGame('random');
                  onClose();
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors"
              >
                🎲 Случайная
              </button>
            </div>
          </div>
        )}
        
        {/* Reset buttons */}
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Сброс данных</h4>
          {onResetDailyQuests && (
            <button
              onClick={() => {
                onResetDailyQuests();
                onClose();
              }}
              className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-semibold transition-colors"
            >
              🔄 Сбросить дейлики
            </button>
          )}
          {onResetStars && (
            <button
              onClick={() => {
                onResetStars();
                onClose();
              }}
              className="w-full py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-semibold transition-colors"
            >
              ⭐ Сбросить звёзды (0)
            </button>
          )}
          {onResetCollections && (
            <button
              onClick={() => {
                onResetCollections();
                onClose();
              }}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-colors"
            >
              🏆 Сбросить коллекции
            </button>
          )}
          {onResetXP && (
            <button
              onClick={() => {
                onResetXP();
                onClose();
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
            >
              📊 Сбросить опыт/уровень
            </button>
          )}
          {onResetAll && (
            <button
              onClick={() => {
                onResetAll();
                onClose();
              }}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition-colors border border-red-500/50 mt-2"
            >
              💥 Сбросить ВСЁ
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}


