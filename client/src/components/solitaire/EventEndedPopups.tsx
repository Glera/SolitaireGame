/**
 * Event Ended Popups
 * 
 * Показываются когда время события истекло.
 * Позволяют потратить оставшиеся ресурсы (ключи/лопаты).
 */

import { TreasureHuntEvent } from '../../lib/liveops/treasureHunt';
import { DungeonDigEvent } from '../../lib/liveops/dungeonDig';

interface EventEndedPopupProps {
  isVisible: boolean;
  event: TreasureHuntEvent;
  onClose: () => void;
  onSpendKeys: () => void;
}

export function EventEndedPopup({ 
  isVisible, 
  event, 
  onClose, 
  onSpendKeys 
}: EventEndedPopupProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mx-4 shadow-2xl border border-gray-700 max-w-sm text-center"
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Время вышло!
        </h2>
        {event.keys > 0 ? (
          <>
            <p className="text-gray-300 mb-4">
              Время ивента истекло, но ты ещё можешь потратить собранные ключи!
            </p>
            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
              <span>🔑</span>
              <span className="font-bold">Осталось ключей: {event.keys}</span>
            </div>
            <button
              onClick={onSpendKeys}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              🔑 Потратить ключи
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-300 mb-4">
              Ивент "Охота за сокровищами" завершён. Не переживай - скоро будут новые события!
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Понятно
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface DungeonEndedPopupProps {
  isVisible: boolean;
  event: DungeonDigEvent;
  onClose: () => void;
  onSpendShovels: () => void;
}

export function DungeonEndedPopup({ 
  isVisible, 
  event, 
  onClose, 
  onSpendShovels 
}: DungeonEndedPopupProps) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mx-4 shadow-2xl border border-gray-700 max-w-sm text-center"
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Время вышло!
        </h2>
        {event.shovels > 0 ? (
          <>
            <p className="text-gray-300 mb-4">
              Время ивента истекло, но ты ещё можешь использовать оставшиеся лопаты!
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
              <span>🪏</span>
              <span className="font-bold">Осталось лопат: {event.shovels}</span>
            </div>
            <button
              onClick={onSpendShovels}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              🪏 Использовать лопаты
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-300 mb-4">
              Ивент "Подземелье" завершён. Скоро начнётся новый ивент!
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Понятно
            </button>
          </>
        )}
      </div>
    </div>
  );
}
