import { create } from 'zustand';
import { GameState, DragState, Card, Suit } from '../solitaire/types';
import { initializeGame, drawFromStock, moveCards, getMovableCards } from '../solitaire/gameLogic';

interface SolitaireStore extends GameState, DragState {
  // Game actions
  newGame: () => void;
  drawCard: () => void;
  
  // Drag and drop actions
  startDrag: (cards: Card[], sourceType: 'tableau' | 'waste' | 'foundation', sourceIndex?: number, sourceFoundation?: Suit) => void;
  endDrag: () => void;
  dropCards: (targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void;
  
  // Utility functions
  getMovableCardsFromTableau: (columnIndex: number) => Card[];
  canAutoMoveToFoundation: (card: Card) => Suit | null;
  autoMoveToFoundation: (card: Card, suit: Suit) => void;
}

export const useSolitaire = create<SolitaireStore>((set, get) => ({
  // Initial game state
  ...initializeGame(),
  
  // Initial drag state
  isDragging: false,
  draggedCards: [],
  sourceType: 'tableau',
  sourceIndex: undefined,
  sourceFoundation: undefined,
  
  newGame: () => {
    const newGameState = initializeGame();
    set({
      ...newGameState,
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined
    });
  },
  
  drawCard: () => {
    const currentState = get();
    const newState = drawFromStock(currentState);
    set(newState);
  },
  
  startDrag: (cards, sourceType, sourceIndex, sourceFoundation) => {
    set({
      isDragging: true,
      draggedCards: cards,
      sourceType,
      sourceIndex,
      sourceFoundation
    });
  },
  
  endDrag: () => {
    set({
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined
    });
  },
  
  dropCards: (targetType, targetIndex, targetFoundation) => {
    const state = get();
    console.log('🎮 dropCards вызвана:', { 
      isDragging: state.isDragging, 
      draggedCards: state.draggedCards.map(c => `${c.rank} ${c.suit}`),
      targetType, 
      targetIndex, 
      targetFoundation 
    });
    
    if (!state.isDragging) {
      console.log('❌ Не в режиме перетаскивания');
      return;
    }
    
    const newGameState = moveCards(
      state,
      state.draggedCards,
      state.sourceType,
      state.sourceIndex,
      state.sourceFoundation,
      targetType,
      targetIndex,
      targetFoundation
    );
    
    if (newGameState) {
      console.log('✅ Ход успешен, обновляем состояние');
      set({
        ...newGameState,
        isDragging: false,
        draggedCards: [],
        sourceType: 'tableau',
        sourceIndex: undefined,
        sourceFoundation: undefined
      });
    } else {
      console.log('❌ Ход недопустим, завершаем перетаскивание');
      get().endDrag();
    }
  },
  
  getMovableCardsFromTableau: (columnIndex) => {
    const state = get();
    return getMovableCards(state.tableau[columnIndex]);
  },
  
  canAutoMoveToFoundation: (card) => {
    const state = get();
    const suit = card.suit;
    const foundationCards = state.foundations[suit];
    
    if (foundationCards.length === 0 && card.rank === 'A') {
      return suit;
    }
    
    if (foundationCards.length > 0) {
      const topCard = foundationCards[foundationCards.length - 1];
      const cardValue = card.rank === 'A' ? 1 : 
                      card.rank === 'J' ? 11 :
                      card.rank === 'Q' ? 12 :
                      card.rank === 'K' ? 13 :
                      parseInt(card.rank);
      const topValue = topCard.rank === 'A' ? 1 :
                      topCard.rank === 'J' ? 11 :
                      topCard.rank === 'Q' ? 12 :
                      topCard.rank === 'K' ? 13 :
                      parseInt(topCard.rank);
                      
      if (cardValue === topValue + 1) {
        return suit;
      }
    }
    
    return null;
  },
  
  autoMoveToFoundation: (card, suit) => {
    const state = get();
    
    // Find the source of the card
    let sourceType: 'tableau' | 'waste' | 'foundation' = 'waste';
    let sourceIndex: number | undefined;
    let sourceFoundation: Suit | undefined;
    
    // Check waste pile
    if (state.waste.length > 0 && state.waste[state.waste.length - 1].id === card.id) {
      sourceType = 'waste';
    } else {
      // Check tableau columns
      for (let i = 0; i < state.tableau.length; i++) {
        const column = state.tableau[i];
        if (column.length > 0 && column[column.length - 1].id === card.id) {
          sourceType = 'tableau';
          sourceIndex = i;
          break;
        }
      }
    }
    
    const newGameState = moveCards(
      state,
      [card],
      sourceType,
      sourceIndex,
      sourceFoundation,
      'foundation',
      undefined,
      suit
    );
    
    if (newGameState) {
      set(newGameState);
    }
  }
}));
