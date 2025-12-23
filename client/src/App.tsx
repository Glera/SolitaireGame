import React, { useEffect, useState } from 'react';
import { GameBoard } from './components/solitaire/GameBoard';
import { useAudio } from './lib/stores/useAudio';
import { useSolitaire } from './lib/stores/useSolitaire';
import { DeviceTestPanel } from './components/DeviceTestPanel';
import { GameViewport } from './components/GameViewport';
import { GameScaleProvider } from './contexts/GameScaleContext';
import GameIntegration from './lib/gameIntegration';
import { FlyingSuitIconManager } from './lib/flyingSuitIconManager';
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
    
    // Register callback for starting new game from lobby (after collection reward)
    gameIntegration.setStartNewGameCallback(() => {
      console.log('🎮 Starting new game from lobby callback');
      newGame('solvable');
    });
  }, [setHitSound, setSuccessSound, getCurrentResults, newGame]);

  const handleSizeChange = (width: number, height: number) => {
    setTestViewport({ width, height });
    setIsTestMode(width !== window.innerWidth || height !== window.innerHeight);
    
    // Force game reinitialization by changing key and starting new game
    setGameKey(prev => prev + 1);
    setTimeout(() => {
      newGame('solvable');
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
        newGame('solvable');
      }, 0);
    }
  };

  return (
    <GameScaleProvider>
      <div className="w-full h-screen relative overflow-hidden">
        <GameViewport 
          width={testViewport.width} 
          height={testViewport.height}
          isTestMode={isTestMode}
        >
          <div 
            key={gameKey}
            style={{
              width: isTestMode ? `${testViewport.width}px` : '100vw',
              height: isTestMode ? `${testViewport.height}px` : '100vh',
              overflow: 'hidden'
            }}
          >
            <GameBoard />
          </div>
        </GameViewport>
        
        {/* Ad banner placeholder - positioned at the bottom, OUTSIDE GameViewport */}
        <div 
          className="fixed bottom-0 left-0 w-full bg-red-600 flex items-center justify-center text-white text-lg font-bold"
          style={{ height: '60px', zIndex: 9999 }}
        >
          🎯 Рекламный баннер 🎯
        </div>
        
        {/* Flying suit icons manager */}
        <FlyingSuitIconManager />
        
{/* DeviceTestPanel temporarily hidden */}
        {/* <DeviceTestPanel
          onSizeChange={handleSizeChange}
          isVisible={testPanelVisible}
          onToggle={handleTogglePanel}
        /> */}
      </div>
    </GameScaleProvider>
  );
}

export default App;
