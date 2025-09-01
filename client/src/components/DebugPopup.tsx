import React, { useState, useEffect } from 'react';

export interface DebugInfo {
  event: string;
  coords: { x: number; y: number };
  target: string;
  timestamp: number;
  extra?: any;
}

interface DebugPopupProps {
  info: DebugInfo | null;
  onClose: () => void;
}

export function DebugPopup({ info, onClose }: DebugPopupProps) {
  const copyToClipboard = async () => {
    if (!info) return;
    
    const debugText = `DEBUG INFO\nEvent: ${info.event}\nCoords: ${info.coords.x}, ${info.coords.y}\nTarget: ${info.target}\nTime: ${new Date(info.timestamp).toLocaleTimeString()}\nExtra: ${info.extra ? JSON.stringify(info.extra, null, 2) : 'none'}`;
    
    try {
      await navigator.clipboard.writeText(debugText);
      alert('Debug info copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback - show text in alert for manual copy
      alert(`Copy this:\n\n${debugText}`);
    }
  };

  if (!info) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="text-sm font-mono">
        <div className="text-yellow-300 font-bold mb-2 flex items-center justify-between">
          🐛 DEBUG INFO
          <button 
            onClick={copyToClipboard}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white ml-2"
            title="Copy to clipboard"
          >
            📋 Copy
          </button>
        </div>
        <div><span className="text-blue-300">Event:</span> {info.event}</div>
        <div><span className="text-blue-300">Coords:</span> {info.coords.x}, {info.coords.y}</div>
        <div><span className="text-blue-300">Target:</span> {info.target}</div>
        <div><span className="text-blue-300">Time:</span> {new Date(info.timestamp).toLocaleTimeString()}</div>
        {info.extra && (
          <div><span className="text-blue-300">Extra:</span> {JSON.stringify(info.extra, null, 1)}</div>
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
    debugCallback({
      event,
      coords,
      target,
      timestamp: Date.now(),
      extra
    });
  }
}