// Integration with game lobby system
class GameIntegration {
  constructor() {
    // Уведомляем лобби что игра готова
    this.notifyReady();
  }
  
  notifyReady() {
    window.parent.postMessage({
      type: 'GAME_READY'
    }, '*');
    console.log('🎮 Game ready notification sent to lobby');
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
