import React, { useEffect, useState } from 'react';
import { GameBoard } from './components/solitaire/GameBoard';
import { useAudio } from './lib/stores/useAudio';
import { DeviceTestPanel } from './components/DeviceTestPanel';
import { GameViewport } from './components/GameViewport';
import "@fontsource/inter";

function App() {
  const { setHitSound, setSuccessSound } = useAudio();
  const [testPanelVisible, setTestPanelVisible] = useState(false);
  const [testViewport, setTestViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isTestMode, setIsTestMode] = useState(false);

  // Initialize audio on component mount
  useEffect(() => {
    // Create audio elements
    const hitAudio = new Audio('/sounds/hit.mp3');
    const successAudio = new Audio('/sounds/success.mp3');
    
    // Set volumes
    hitAudio.volume = 0.3;
    successAudio.volume = 0.5;
    
    // Store in audio store
    setHitSound(hitAudio);
    setSuccessSound(successAudio);
  }, [setHitSound, setSuccessSound]);

  const handleSizeChange = (width: number, height: number) => {
    setTestViewport({ width, height });
    setIsTestMode(width !== window.innerWidth || height !== window.innerHeight);
  };

  const handleTogglePanel = () => {
    const newVisible = !testPanelVisible;
    setTestPanelVisible(newVisible);
    
    // If closing panel, reset to normal view
    if (!newVisible) {
      setIsTestMode(false);
      setTestViewport({ width: window.innerWidth, height: window.innerHeight });
    }
  };

  return (
    <div className="w-full h-full relative">
      <GameViewport 
        width={testViewport.width} 
        height={testViewport.height}
        isTestMode={isTestMode}
      >
        <GameBoard />
      </GameViewport>
      
      <DeviceTestPanel
        onSizeChange={handleSizeChange}
        isVisible={testPanelVisible}
        onToggle={handleTogglePanel}
      />
    </div>
  );
}

export default App;
