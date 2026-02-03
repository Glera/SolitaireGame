import React from 'react';
import ReactDOM from 'react-dom';

// Color scheme configurations
type ColorScheme = 'amber' | 'cyan' | 'pink';

const colorSchemes: Record<ColorScheme, {
  gradient: string;
  border: string;
  headerText: string;
  buttonGradient: string;
  buttonHover: string;
}> = {
  amber: {
    gradient: 'from-amber-900 via-orange-900 to-amber-900',
    border: 'border-amber-500/50',
    headerText: 'text-amber-300',
    buttonGradient: 'from-amber-500 to-orange-500',
    buttonHover: 'hover:from-amber-400 hover:to-orange-400',
  },
  cyan: {
    gradient: 'from-cyan-900 via-blue-900 to-cyan-900',
    border: 'border-cyan-500/50',
    headerText: 'text-cyan-300',
    buttonGradient: 'from-cyan-500 to-blue-500',
    buttonHover: 'hover:from-cyan-400 hover:to-blue-400',
  },
  pink: {
    gradient: 'from-purple-900 via-pink-900 to-purple-900',
    border: 'border-pink-500/50',
    headerText: 'text-pink-300',
    buttonGradient: 'from-pink-500 to-purple-500',
    buttonHover: 'hover:from-pink-400 hover:to-purple-400',
  },
};

// Section configuration for feature explanations
export interface UnlockSection {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
}

// Feature icon for the feature list (optional)
export interface FeatureIcon {
  emoji: string;
  label: string;
}

export interface UnlockPopupProps {
  onClose: () => void;
  colorScheme: ColorScheme;
  headerEmoji: string;
  headerTitle: string;
  headerSubtitle: string;
  sections: UnlockSection[];
  featureIcons?: FeatureIcon[];
  buttonText: string;
}

/**
 * Unlock Popup Component
 * 
 * SIMPLIFIED: No isVisible prop - parent controls rendering via conditional.
 * This prevents issues with first-click being ignored.
 */
export function UnlockPopup({
  onClose,
  colorScheme,
  headerEmoji,
  headerTitle,
  headerSubtitle,
  sections,
  featureIcons,
  buttonText,
}: UnlockPopupProps) {
  const colors = colorSchemes[colorScheme];

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10005] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      />

      {/* Content */}
      <div
        className={`relative bg-gradient-to-br ${colors.gradient} rounded-2xl p-5 max-w-md w-full mx-4 border-2 ${colors.border} shadow-2xl max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{headerEmoji}</div>
          <h2 className={`text-xl font-bold ${colors.headerText} mb-1`}>
            {headerTitle}
          </h2>
          <p className="text-white/80 text-sm">{headerSubtitle}</p>
        </div>

        {/* Sections */}
        {sections.map((section, index) => (
          <div
            key={index}
            className={`bg-black/30 rounded-xl p-3 ${index < sections.length - 1 ? 'mb-3' : 'mb-4'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{section.emoji}</span>
              <div>
                <h3 className="text-base font-bold text-white">{section.title}</h3>
                <p className="text-white/70 text-xs">{section.subtitle}</p>
              </div>
            </div>
            <p className="text-white/60 text-xs">{section.description}</p>
          </div>
        ))}

        {/* Feature Icons (optional) */}
        {featureIcons && featureIcons.length > 0 && (
          <div className="flex justify-around mb-4 text-center">
            {featureIcons.map((icon, index) => (
              <div key={index}>
                <div className="text-xl mb-1">{icon.emoji}</div>
                <div className="text-xs text-white/70">{icon.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`w-full py-2.5 bg-gradient-to-r ${colors.buttonGradient} ${colors.buttonHover} text-white font-bold rounded-xl transition-all shadow-lg`}
        >
          {buttonText}
        </button>
      </div>
    </div>,
    document.body
  );
}

// Pre-configured unlock popup configurations
export const UNLOCK_CONFIGS: {
  collections: Omit<UnlockPopupProps, 'onClose'>;
  leaderboard: Omit<UnlockPopupProps, 'onClose' | 'headerSubtitle'>;
  promo: Omit<UnlockPopupProps, 'onClose'>;
} = {
  collections: {
    colorScheme: 'amber',
    headerEmoji: '🎉',
    headerTitle: 'Новая функция!',
    headerSubtitle: 'Достигнут 2 уровень',
    sections: [
      {
        emoji: '🏆',
        title: 'Коллекции',
        subtitle: 'Собирайте уникальные предметы',
        description:
          'Открывайте паки с предметами и собирайте полные коллекции. За каждую собранную коллекцию вы получите награду в звёздах!',
      },
      {
        emoji: '📦',
        title: 'Ивент: Паки',
        subtitle: 'Зарабатывайте награды за игру',
        description:
          'Убирайте карты с поля, заполняйте прогресс бар и получайте паки с предметами коллекций и звёзды. Чем выше редкость пака - тем ценнее предметы!',
      },
    ],
    buttonText: 'Понятно! 🎮',
  },
  leaderboard: {
    colorScheme: 'cyan',
    headerEmoji: '🎉',
    headerTitle: 'Новая функция!',
    // headerSubtitle will be set dynamically with required level
    sections: [
      {
        emoji: '🏆',
        title: 'Турнир',
        subtitle: 'Соревнуйтесь с другими игроками',
        description:
          'Вы находитесь в группе из 20 игроков. Набирайте звёзды за победы и поднимайтесь в турнире. В конце сезона лучшие игроки получат награды!',
      },
    ],
    buttonText: 'Понятно! 🎮',
  },
  promo: {
    colorScheme: 'pink',
    headerEmoji: '🎁',
    headerTitle: 'Специальные предложения!',
    headerSubtitle: 'Открыт доступ к акциям',
    sections: [
      {
        emoji: '🛍️',
        title: 'Магазин акций',
        subtitle: 'Выгодные наборы с ограниченным временем',
        description:
          'Теперь вам доступны специальные предложения! Следите за таймером — акции обновляются регулярно. Покупайте наборы звёзд и паки коллекций по выгодным ценам!',
      },
    ],
    featureIcons: [
      { emoji: '⭐', label: 'Звёзды' },
      { emoji: '🎴', label: 'Паки' },
      { emoji: '⏰', label: 'Таймер' },
    ],
    buttonText: 'Отлично! 🛒',
  },
};
