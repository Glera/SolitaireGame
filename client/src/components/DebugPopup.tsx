import React, { useState, useEffect } from 'react';
import { useSolitaire } from '../lib/stores/useSolitaire';
import { perfMonitor } from '../lib/solitaire/performanceMonitor';

export interface DebugInfo {
  event: string;
  coords: { x: number; y: number };
  target: string;
  timestamp: number;
  extra?: any;
  viewport?: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  gameField?: {
    bounds: DOMRect;
    offset: { x: number; y: number };
  };
  dropZones?: Array<{
    id: string;
    bounds: DOMRect;
    type: string;
  }>;
  gameState?: {
    draggedCards: string[];
    moveResult: 'success' | 'failed' | 'pending';
  };
}

interface DebugPopupProps {
  info: DebugInfo | null;
  onClose: () => void;
}

export function DebugPopup({ info, onClose }: DebugPopupProps) {
  const { collisionHighlightEnabled, setCollisionHighlight } = useSolitaire();
  const [perfStats, setPerfStats] = useState<{ name: string; avg: number; count: number; max: number }[]>([]);
  
  // Update performance stats every second
  useEffect(() => {
    const updateStats = () => {
      setPerfStats(perfMonitor.getAverages());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const copyToClipboard = async () => {
    if (!info) return;
    
    let debugText = `=== DEBUG INFO ===\n`;
    if (info.event) debugText += `Event: ${info.event}\n`;
    if (info.coords) debugText += `Drop Coords: ${info.coords.x}, ${info.coords.y}\n`;
    if (info.target) debugText += `Target: ${info.target}\n`;
    if (info.timestamp) debugText += `Time: ${new Date(info.timestamp).toLocaleTimeString()}\n`;
    debugText += `\n`;
    
    if (info.data) {
      debugText += `=== DATA ===\n`;
      Object.entries(info.data).forEach(([key, value]) => {
        debugText += `${key}: ${value}\n`;
      });
      debugText += `\n`;
    }
    
    if (info.viewport) {
      debugText += `=== VIEWPORT ===\n`;
      debugText += `Size: ${info.viewport.width} × ${info.viewport.height}\n`;
      debugText += `Scroll: ${info.viewport.scrollX}, ${info.viewport.scrollY}\n\n`;
    }
    
    if (info.gameField) {
      debugText += `=== GAME FIELD ===\n`;
      debugText += `Bounds: ${Math.round(info.gameField.bounds.x)}, ${Math.round(info.gameField.bounds.y)}, ${Math.round(info.gameField.bounds.width)} × ${Math.round(info.gameField.bounds.height)}\n`;
      debugText += `Offset: ${info.gameField.offset.x}, ${info.gameField.offset.y}\n\n`;
    }
    
    if (info.dropZones && info.dropZones.length > 0) {
      debugText += `=== DROP ZONES ===\n`;
      info.dropZones.forEach(zone => {
        debugText += `${zone.id} (${zone.type}): ${Math.round(zone.bounds.x)}, ${Math.round(zone.bounds.y)}, ${Math.round(zone.bounds.width)} × ${Math.round(zone.bounds.height)}\n`;
      });
      debugText += `\n`;
    }
    
    if (info.extra) {
      debugText += `=== EXTRA INFO ===\n${JSON.stringify(info.extra, null, 2)}\n\n`;
    }
    
    // Check which drop zone the coords fall into
    if (info.dropZones && info.coords) {
      debugText += `=== DROP ZONE CHECK ===\n`;
      const matchingZones = info.dropZones.filter(zone => {
        return info.coords.x >= zone.bounds.left && 
               info.coords.x <= zone.bounds.right &&
               info.coords.y >= zone.bounds.top && 
               info.coords.y <= zone.bounds.bottom;
      });
      
      if (matchingZones.length > 0) {
        debugText += `Drop coords match zones: ${matchingZones.map(z => z.id).join(', ')}\n`;
      } else {
        debugText += `Drop coords DO NOT match any drop zone!\n`;
      }
    }
    
    try {
      await navigator.clipboard.writeText(debugText);
      alert('Debug info copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback - show text in alert for manual copy
      alert(`Copy this:\n\n${debugText}`);
    }
  };

  // Calculate positioning based on game field
  const getPositioning = () => {
    // Try to find actual game field (with cards), not the whole screen
    const gameField = document.querySelector('[data-game-field]') as HTMLElement;
    if (gameField) {
      const bounds = gameField.getBoundingClientRect();
      // Position to the right of game field with small gap
      if (bounds.right + 340 < window.innerWidth) {
        return {
          top: `${bounds.top}px`,
          left: `${bounds.right + 16}px`,
          right: 'auto'
        };
      }
    }
    
    // Fallback to right side
    return {
      top: '16px',
      left: 'auto',
      right: '16px'
    };
  };

  return (
    <div 
      className="fixed bg-black/90 text-white p-4 rounded-lg shadow-lg max-w-sm"
      style={{
        ...getPositioning(),
        zIndex: 9999
      }}
    >
      <div className="text-sm font-mono">
        <div className="text-yellow-300 font-bold mb-2 flex items-center justify-between">
          🐛 DEBUG INFO
          {info && (
            <button 
              onClick={copyToClipboard}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white ml-2"
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
          )}
        </div>
        
        <div className="mb-3 pb-3 border-b border-gray-600">
          <label className="flex items-center gap-2 cursor-pointer text-white">
            <input 
              type="checkbox" 
              checked={collisionHighlightEnabled}
              onChange={(e) => setCollisionHighlight(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm">Enable collision highlights</span>
          </label>
        </div>
        
        {perfStats.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-600">
            <div className="text-yellow-300 text-xs font-bold mb-2">PERFORMANCE</div>
            <div className="text-xs">
              {perfStats.slice(0, 5).map((stat) => (
                <div key={stat.name} className="mb-1">
                  <span className="text-blue-300">{stat.name}:</span>{' '}
                  <span className={stat.avg > 10 ? 'text-red-400' : stat.avg > 5 ? 'text-yellow-400' : 'text-green-400'}>
                    {stat.avg.toFixed(2)}ms
                  </span>
                  <span className="text-gray-400"> (max: {stat.max.toFixed(2)}ms, n={stat.count})</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => perfMonitor.reset()}
              className="mt-2 text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
            >
              Reset Stats
            </button>
          </div>
        )}
        
        {info ? (
          <>
            {info.event && <div><span className="text-blue-300">Event:</span> {info.event}</div>}
            {info.coords && <div><span className="text-blue-300">Drop:</span> {info.coords.x}, {info.coords.y}</div>}
            {info.target && <div><span className="text-blue-300">Target:</span> {info.target}</div>}
            
            {/* Display data object if present (for scale info, etc) */}
            {info.data && (
              <div className="mt-2 space-y-1">
                {Object.entries(info.data).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-green-300">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400">Нет дебаг информации. Откройте панель для просмотра.</div>
        )}
        
        {info?.viewport && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-yellow-300 text-xs font-bold">VIEWPORT</div>
            <div className="text-xs">{info.viewport.width} × {info.viewport.height}</div>
          </div>
        )}
        
        {info?.gameField && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-yellow-300 text-xs font-bold">GAME FIELD</div>
            <div className="text-xs">{Math.round(info.gameField.bounds.x)}, {Math.round(info.gameField.bounds.y)}</div>
          </div>
        )}
        
        {info?.dropZones && info.dropZones.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-yellow-300 text-xs font-bold">DROP ZONES</div>
            <div className="text-xs max-h-20 overflow-y-auto">
              {info.dropZones.slice(0, 3).map(zone => (
                <div key={zone.id} className="mb-1">
                  {zone.id}: {Math.round(zone.bounds.x)}, {Math.round(zone.bounds.y)}
                </div>
              ))}
              {info.dropZones.length > 3 && <div>... +{info.dropZones.length - 3} more</div>}
            </div>
          </div>
        )}
        
        {info?.extra && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-yellow-300 text-xs font-bold">EXTRA</div>
            <div className="text-xs">{JSON.stringify(info.extra, null, 1)}</div>
          </div>
        )}
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-600">
          <div className="text-gray-400 text-xs">Manual close only</div>
          <button 
            onClick={onClose}
            className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Global debug state
let debugCallback: ((info: DebugInfo) => void) | null = null;

export function setDebugCallback(callback: (info: DebugInfo) => void) {
  debugCallback = callback;
}

export function showDebugInfo(event: string, coords: { x: number; y: number }, target: string, extra?: any) {
  if (debugCallback) {
    // Collect comprehensive debug info
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    // Try to find game field bounds
    const gameField = document.querySelector('[data-game-board]') as HTMLElement;
    let gameFieldInfo = gameField ? {
      bounds: gameField.getBoundingClientRect(),
      offset: {
        x: gameField.offsetLeft,
        y: gameField.offsetTop
      }
    } : undefined;
    
    // Find the rightmost tableau column (column 6) for better positioning
    const lastTableauColumn = document.querySelector('[data-tableau-column="6"]') as HTMLElement;
    if (lastTableauColumn) {
      const columnBounds = lastTableauColumn.getBoundingClientRect();
      gameFieldInfo = {
        bounds: {
          ...gameFieldInfo?.bounds,
          right: columnBounds.right
        } as DOMRect,
        offset: gameFieldInfo?.offset || { x: 0, y: 0 }
      };
    }

    // Collect all drop zones
    const dropZones: Array<{id: string; bounds: DOMRect; type: string}> = [];
    
    // Foundation piles
    ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
      const el = document.getElementById(`foundation-${suit}`);
      if (el) {
        dropZones.push({
          id: `foundation-${suit}`,
          bounds: el.getBoundingClientRect(),
          type: 'foundation'
        });
      }
    });

    // Tableau columns
    for (let i = 0; i < 7; i++) {
      const el = document.querySelector(`[data-tableau-column="${i}"]`) as HTMLElement;
      if (el) {
        dropZones.push({
          id: `tableau-${i}`,
          bounds: el.getBoundingClientRect(),
          type: 'tableau'
        });
      }
    }

    // Stock and waste piles
    const stockEl = document.querySelector('[data-stock-pile]') as HTMLElement;
    if (stockEl) {
      dropZones.push({
        id: 'stock',
        bounds: stockEl.getBoundingClientRect(),
        type: 'stock'
      });
    }
    
    const wasteEl = document.querySelector('[data-waste-pile]') as HTMLElement;
    if (wasteEl) {
      dropZones.push({
        id: 'waste',
        bounds: wasteEl.getBoundingClientRect(),
        type: 'waste'
      });
    }

    debugCallback({
      event,
      coords,
      target,
      timestamp: Date.now(),
      extra,
      viewport,
      gameField: gameFieldInfo,
      dropZones,
      gameState: {
        draggedCards: [], // Will be filled by game components
        moveResult: 'pending'
      }
    });
  }
}