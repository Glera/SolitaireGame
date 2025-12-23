// Integration with game lobby system
class GameIntegration {
  private getCurrentResultsCallback?: () => { score: number; giftsEarned: number } | null;
  private startNewGameCallback?: () => void;

  constructor() {
    // Уведомляем лобби что игра готова
    this.notifyReady();
    // Слушаем сообщения от лобби
    this.setupMessageListener();
  }
  
  notifyReady() {
    window.parent.postMessage({
      type: 'GAME_READY'
    }, '*');
    console.log('🎮 Game ready notification sent to lobby');
  }
  
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'REQUEST_CURRENT_RESULTS') {
        console.log('📊 Lobby requested current results');
        
        if (this.getCurrentResultsCallback) {
          const results = this.getCurrentResultsCallback();
          if (results) {
            window.parent.postMessage({
              type: 'CURRENT_RESULTS',
              score: results.score,
              giftsEarned: results.giftsEarned
            }, '*');
            
            console.log('📤 Current results sent to lobby:', results);
          } else {
            console.log('⚠️ No current results available');
          }
        } else {
          console.log('⚠️ No callback set for current results');
        }
      }
      
      // Обработка сообщения для запуска следующего уровня после награды за коллекцию
      if (event.data.type === 'START_NEXT_LEVEL' || event.data.type === 'START_GAME' || event.data.type === 'NEW_GAME') {
        console.log('🎮 Received start next level message from lobby');
        if (this.startNewGameCallback) {
          this.startNewGameCallback();
        }
      }
    });
  }
  
  setGetCurrentResultsCallback(callback: () => { score: number; giftsEarned: number } | null) {
    this.getCurrentResultsCallback = callback;
  }
  
  setStartNewGameCallback(callback: () => void) {
    this.startNewGameCallback = callback;
  }
  
  // Вызывается когда игра закончена
  onGameEnd(score: number, gameTime: number, giftsEarned: number = 0) {
    const tokensEarned = Math.floor(score / 100); // 1 токен за 100 очков
    
    window.parent.postMessage({
      type: 'GAME_RESULT',
      payload: {
        tokensEarned,
        score,
        gameTime,
        giftsEarned
      }
    }, '*');
    
    console.log('🏁 Game result sent to lobby:', {
      tokensEarned,
      score,
      gameTime,
      giftsEarned
    });
  }
  
  // Статический метод для получения экземпляра
  static getInstance(): GameIntegration {
    if (!(window as any).gameIntegration) {
      (window as any).gameIntegration = new GameIntegration();
    }
    return (window as any).gameIntegration;
  }
}

export default GameIntegration;
