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
  useEffect(() => {
    if (info) {
      const timer = setTimeout(onClose, 3000); // Auto close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [info, onClose]);

  if (!info) return null;

  return (
    <div 
      className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
      onClick={onClose}
    >
      <div className="text-sm font-mono">
        <div className="text-yellow-300 font-bold mb-2">🐛 DEBUG INFO</div>
        <div><span className="text-blue-300">Event:</span> {info.event}</div>
        <div><span className="text-blue-300">Coords:</span> {info.coords.x}, {info.coords.y}</div>
        <div><span className="text-blue-300">Target:</span> {info.target}</div>
        <div><span className="text-blue-300">Time:</span> {new Date(info.timestamp).toLocaleTimeString()}</div>
        {info.extra && (
          <div><span className="text-blue-300">Extra:</span> {JSON.stringify(info.extra, null, 1)}</div>
        )}
        <div className="text-gray-400 text-xs mt-2">Click to close</div>
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