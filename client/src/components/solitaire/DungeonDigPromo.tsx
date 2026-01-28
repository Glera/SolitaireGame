import React from 'react';

interface DungeonDigPromoProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DungeonDigPromo: React.FC<DungeonDigPromoProps> = ({
  isVisible,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-stone-800 via-amber-900 to-stone-900 rounded-2xl max-w-sm mx-4 border-2 border-amber-600/50 shadow-2xl overflow-hidden animate-[bounceIn_0.5s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with sparkles */}
        <div className="relative bg-gradient-to-r from-amber-700/50 to-stone-700/50 px-6 py-4 text-center">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-2 left-4 text-amber-400/60 animate-pulse">⚡</div>
            <div className="absolute top-3 right-6 text-amber-400/60 animate-pulse delay-100">⚡</div>
            <div className="absolute bottom-2 left-8 text-amber-400/60 animate-pulse delay-200">⚡</div>
          </div>
          <h2 className="text-2xl font-bold text-amber-100 relative z-10">🎉 Новое событие!</h2>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="text-center">
            <div className="text-6xl mb-3">⛏️</div>
            <h3 className="text-xl font-bold text-amber-100 mb-2">Подземелье</h3>
            <p className="text-amber-200/80 text-sm leading-relaxed">
              Теперь на картах появляются <span className="text-amber-300 font-bold">🪏 лопатки</span>!
            </p>
          </div>
          
          {/* How it works */}
          <div className="bg-black/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🃏</span>
              <p className="text-amber-100/90 text-sm">
                Убирай карты с лопатками в стопки сбора
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🪏</span>
              <p className="text-amber-100/90 text-sm">
                Копай от входа — открывай соседние тайлы
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚪</span>
              <p className="text-amber-100/90 text-sm">
                Найди выход чтобы спуститься глубже!
              </p>
            </div>
          </div>
          
          {/* Timer hint */}
          <p className="text-center text-amber-300/60 text-xs">
            ⏱️ Событие активно 5 минут
          </p>
        </div>
        
        {/* Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Копать! ⛏️
          </button>
        </div>
      </div>
    </div>
  );
};
