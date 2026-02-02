import React from 'react';
import ReactDOM from 'react-dom';

export interface LockedFeatureConfig {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  requiredLevel: number;
  accentColor: 'blue' | 'amber' | 'cyan';
}

// Predefined configurations for different features
export const LOCKED_FEATURES = {
  pointsEvent: {
    icon: '📦',
    title: 'Ивент: Паки',
    subtitle: 'Зарабатывайте награды за игру',
    description: 'Убирайте карты с поля, заполняйте прогресс бар и получайте паки с предметами коллекций и звёзды!',
    requiredLevel: 2,
    accentColor: 'blue' as const,
  },
  collections: {
    icon: '🏆',
    title: 'Коллекции',
    subtitle: 'Собирайте уникальные предметы',
    description: 'Открывайте паки с предметами и собирайте полные коллекции для получения наград в звёздах!',
    requiredLevel: 2,
    accentColor: 'amber' as const,
  },
  leaderboard: {
    icon: '🏆',
    title: 'Турнир',
    subtitle: 'Соревнуйтесь с другими игроками',
    description: 'Соревнуйтесь с 20 игроками в группе, набирайте звёзды и поднимайтесь в турнире. Лучшие игроки получают призы!',
    requiredLevel: 4,
    accentColor: 'cyan' as const,
  },
  dungeonDig: {
    icon: '⛏️',
    title: 'Подземелье',
    subtitle: 'Копай и открывай награды',
    description: 'Исследуй подземелье, собирай лопатки в пасьянсе и открывай тайлы с наградами. Найди выход на следующий этаж!',
    requiredLevel: 5,
    accentColor: 'amber' as const,
  },
  treasureHunt: {
    icon: '🗝️',
    title: 'Охота за сокровищами',
    subtitle: 'Собирай ключи и открывай сундуки',
    description: 'Собирай ключи в пасьянсе и открывай сундуки с наградами. Исследуй все этажи подземелья!',
    requiredLevel: 3,
    accentColor: 'amber' as const,
  },
} as const;

const accentColorClasses = {
  blue: {
    title: 'text-blue-400',
    badge: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
  },
  amber: {
    title: 'text-amber-400',
    badge: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
  },
  cyan: {
    title: 'text-cyan-400',
    badge: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
  },
};

interface LockedFeaturePopupProps {
  isVisible: boolean;
  onClose: () => void;
  feature: LockedFeatureConfig;
}

export function LockedFeaturePopup({ isVisible, onClose, feature }: LockedFeaturePopupProps) {
  if (!isVisible) return null;
  
  const colors = accentColorClasses[feature.accentColor];
  
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[10005] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border-2 border-gray-600/50 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-200 mb-1">Функция заблокирована</h2>
        </div>
        
        {/* Info */}
        <div className="bg-black/30 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{feature.icon}</span>
            <div>
              <h3 className={`text-lg font-bold ${colors.title}`}>{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.subtitle}</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-3">
            {feature.description}
          </p>
          <div className={`flex items-center gap-2 ${colors.badge} rounded-lg px-3 py-2`}>
            <span className="text-xl">⭐</span>
            <span className={`${colors.badgeText} text-sm font-medium`}>
              Разблокируется на {feature.requiredLevel} уровне
            </span>
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body
  );
}

// Convenience wrapper that takes feature key instead of config
interface LockedFeaturePopupByKeyProps {
  isVisible: boolean;
  onClose: () => void;
  featureKey: keyof typeof LOCKED_FEATURES;
  /** Override required level (useful for dynamic levels) */
  requiredLevelOverride?: number;
}

export function LockedFeaturePopupByKey({ 
  isVisible, 
  onClose, 
  featureKey,
  requiredLevelOverride 
}: LockedFeaturePopupByKeyProps) {
  const feature = LOCKED_FEATURES[featureKey];
  const config = requiredLevelOverride 
    ? { ...feature, requiredLevel: requiredLevelOverride }
    : feature;
    
  return (
    <LockedFeaturePopup 
      isVisible={isVisible} 
      onClose={onClose} 
      feature={config} 
    />
  );
}
