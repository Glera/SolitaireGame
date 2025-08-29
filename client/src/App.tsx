import React, { useEffect } from 'react';
import { GameBoard } from './components/solitaire/GameBoard';
import { useAudio } from './lib/stores/useAudio';
import "@fontsource/inter";

function App() {
  const { setHitSound, setSuccessSound } = useAudio();

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

  return (
    <div className="w-full h-full">
      <GameBoard />
    </div>
  );
}

export default App;
