import React, { useEffect, useState } from 'react';
import { GameBoard } from './components/solitaire/GameBoard';
import { useAudio } from './lib/stores/useAudio';
import { useSolitaire } from './lib/stores/useSolitaire';
import { DeviceTestPanel } from './components/DeviceTestPanel';
import { GameViewport } from './components/GameViewport';
import GameIntegration from './lib/gameIntegration';
import "@fontsource/inter";

function App() {
  const { setHitSound, setSuccessSound } = useAudio();
  const { newGame, getCurrentResults } = useSolitaire();
  const [testPanelVisible, setTestPanelVisible] = useState(false);
  const [testViewport, setTestViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isTestMode, setIsTestMode] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  // Initialize audio and game integration on component mount
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
    
    // Initialize game integration with lobby
    const gameIntegration = GameIntegration.getInstance();
    
    // Register callback for current results requests from lobby
    gameIntegration.setGetCurrentResultsCallback(getCurrentResults);
  }, [setHitSound, setSuccessSound, getCurrentResults]);

  const handleSizeChange = (width: number, height: number) => {
    setTestViewport({ width, height });
    setIsTestMode(width !== window.innerWidth || height !== window.innerHeight);
    
    // Force game reinitialization by changing key and starting new game
    setGameKey(prev => prev + 1);
    setTimeout(() => {
      newGame();
    }, 0);
  };

  const handleTogglePanel = () => {
    const newVisible = !testPanelVisible;
    setTestPanelVisible(newVisible);
    
    // If closing panel, reset to normal view and reinitialize game
    if (!newVisible) {
      setIsTestMode(false);
      setTestViewport({ width: window.innerWidth, height: window.innerHeight });
      setGameKey(prev => prev + 1);
      setTimeout(() => {
        newGame();
      }, 0);
    }
  };

  return (
    <div className="w-full h-full relative">
      <GameViewport 
        width={testViewport.width} 
        height={testViewport.height}
        isTestMode={isTestMode}
      >
        <div 
          key={gameKey}
          style={{
            width: isTestMode ? `${testViewport.width}px` : '100%',
            height: isTestMode ? `${testViewport.height}px` : '100%',
            overflow: 'hidden'
          }}
        >
          <GameBoard />
        </div>
      </GameViewport>
      
{/* DeviceTestPanel temporarily hidden */}
      {/* <DeviceTestPanel
        onSizeChange={handleSizeChange}
        isVisible={testPanelVisible}
        onToggle={handleTogglePanel}
      /> */}
    </div>
  );
}

export default App;
