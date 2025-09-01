import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  description: string;
}

const devicePresets: DevicePreset[] = [
  { name: 'Desktop', width: 1920, height: 1080, description: 'Full HD Desktop' },
  { name: 'Laptop', width: 1366, height: 768, description: 'Standard Laptop' },
  { name: 'Tablet', width: 768, height: 1024, description: 'iPad Portrait' },
  { name: 'Tablet L', width: 1024, height: 768, description: 'iPad Landscape' },
  { name: 'Phone L', width: 667, height: 375, description: 'iPhone Landscape' },
  { name: 'Phone', width: 375, height: 667, description: 'iPhone Portrait' },
  { name: 'Phone S', width: 320, height: 568, description: 'Small Phone' },
  { name: 'Custom', width: 800, height: 600, description: 'Custom Size' }
];

interface DeviceTestPanelProps {
  onSizeChange: (width: number, height: number) => void;
  isVisible: boolean;
  onToggle: () => void;
}

export function DeviceTestPanel({ onSizeChange, isVisible, onToggle }: DeviceTestPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState('Desktop');
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [currentViewport, setCurrentViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const updateViewport = () => {
      setCurrentViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const handleDeviceSelect = (device: DevicePreset) => {
    setSelectedDevice(device.name);
    
    if (device.name === 'Custom') {
      onSizeChange(customWidth, customHeight);
    } else {
      onSizeChange(device.width, device.height);
    }
  };

  const handleCustomSize = () => {
    if (selectedDevice === 'Custom') {
      onSizeChange(customWidth, customHeight);
    }
  };

  const resetToActual = () => {
    setSelectedDevice('Actual');
    onSizeChange(window.innerWidth, window.innerHeight);
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
      >
        📱 Тест устройств
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Тест устройств</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
        <div className="text-gray-600">Текущий размер:</div>
        <div className="font-mono text-blue-600">
          {currentViewport.width} × {currentViewport.height}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {devicePresets.map((device) => (
          <button
            key={device.name}
            onClick={() => handleDeviceSelect(device)}
            className={cn(
              "p-3 text-left rounded-lg border transition-all",
              selectedDevice === device.name
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
            )}
          >
            <div className="font-medium text-sm">{device.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {device.width} × {device.height}
            </div>
            <div className="text-xs text-gray-400 mt-1">{device.description}</div>
          </button>
        ))}
      </div>

      {selectedDevice === 'Custom' && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Произвольный размер:</div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Ширина</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 800)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="320"
                max="2560"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Высота</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 600)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="240"
                max="1440"
              />
            </div>
          </div>
          <button
            onClick={handleCustomSize}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            Применить размер
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={resetToActual}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          Сбросить
        </button>
        <button
          onClick={() => {
            const width = prompt('Ширина:', currentViewport.width.toString());
            const height = prompt('Высота:', currentViewport.height.toString());
            if (width && height) {
              const w = parseInt(width);
              const h = parseInt(height);
              if (w > 0 && h > 0) {
                setCustomWidth(w);
                setCustomHeight(h);
                setSelectedDevice('Custom');
                onSizeChange(w, h);
              }
            }
          }}
          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          Быстрый ввод
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Совет: Используйте инструменты разработчика браузера (F12) для более точного тестирования мобильных устройств
      </div>
    </div>
  );
}