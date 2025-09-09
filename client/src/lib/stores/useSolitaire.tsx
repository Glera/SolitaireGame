import { create } from 'zustand';
import { GameState, DragState, Card, Suit } from '../solitaire/types';
import { initializeGame, drawFromStock, moveCards, getMovableCards } from '../solitaire/gameLogic';
import { clearAllDropTargetHighlights } from '../solitaire/styleManager';
import { calculateCardPoints, resetScoredCards } from '../solitaire/scoring';
import { addPointsToProgress } from '../solitaire/progressManager';
import { addFloatingScore } from '../solitaire/floatingScoreManager';

interface AnimatingCard {
  card: Card;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  targetSuit: Suit;
  cardStartPosition?: { x: number; y: number } | null;
}

interface SolitaireStore extends GameState, DragState {
  // Game actions
  newGame: () => void;
  drawCard: () => void;
  
  // Drag and drop actions
  startDrag: (cards: Card[], sourceType: 'tableau' | 'waste' | 'foundation', sourceIndex?: number, sourceFoundation?: Suit) => void;
  endDrag: () => void;
  dropCards: (targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void;
  
  // Animation state
  animatingCard: AnimatingCard | null;
  setAnimatingCard: (card: AnimatingCard | null) => void;
  
  // Drag preview state
  showDragPreview: boolean;
  dragPreviewPosition: { x: number; y: number } | null;
  dragOffset: { x: number; y: number } | null;
  setShowDragPreview: (show: boolean, position?: { x: number; y: number }, offset?: { x: number; y: number }) => void;
  
  // Debug settings
  collisionHighlightEnabled: boolean;
  setCollisionHighlight: (enabled: boolean) => void;
  
  // Utility functions
  getMovableCardsFromTableau: (columnIndex: number) => Card[];
  canAutoMoveToFoundation: (card: Card) => Suit | null;
  autoMoveToFoundation: (card: Card, suit: Suit, startElement?: HTMLElement, endElement?: HTMLElement) => void;
  completeCardAnimation: (card: Card, suit: Suit, cardStartPosition?: { x: number; y: number } | null) => void;
  
  // Progress bar functions
  addPointsToProgress: (points: number) => void;
  onGiftEarned: (gifts: number) => void;
  
  // Floating scores functions
  addFloatingScore: (points: number, x: number, y: number, cardRank: string) => void;
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
  
  // Animation state
  animatingCard: null,
  
  // Drag preview state
  showDragPreview: false,
  dragPreviewPosition: null,
  dragOffset: null,
  
  // Debug settings
  collisionHighlightEnabled: false,
  
  setCollisionHighlight: (enabled) => {
    set({ collisionHighlightEnabled: enabled });
  },
  
  newGame: () => {
    const newGameState = initializeGame();
    resetScoredCards(); // Reset scored cards for new game
    set({
      ...newGameState,
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined,
      animatingCard: null
    });
  },
  
  setAnimatingCard: (card) => {
    set({ animatingCard: card });
  },
  
  setShowDragPreview: (show, position, offset) => {
    set({ 
      showDragPreview: show, 
      dragPreviewPosition: position || null,
      dragOffset: offset || null 
    });
  },
  
  drawCard: () => {
    const currentState = get();
    const newState = drawFromStock(currentState);
    set(newState);
  },
  
  startDrag: (cards, sourceType, sourceIndex, sourceFoundation) => {
    const currentState = get();
    set({
      isDragging: true,
      draggedCards: cards,
      sourceType,
      sourceIndex,
      sourceFoundation,
      // Keep the current showDragPreview state (set by TableauColumn)
      showDragPreview: currentState.showDragPreview,
      dragPreviewPosition: currentState.dragPreviewPosition
    });
  },
  
  endDrag: () => {
    // Clear all visual feedback when drag ends
    clearAllDropTargetHighlights();
    
    set({
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined,
      showDragPreview: false,
      dragPreviewPosition: null,
      dragOffset: null
    });
  },
  
  dropCards: (targetType, targetIndex, targetFoundation) => {
    const state = get();
    
    console.log('🏢 dropCards called:', {
      isDragging: state.isDragging,
      draggedCards: state.draggedCards.map(c => `${c.suit}-${c.rank}`),
      source: { type: state.sourceType, index: state.sourceIndex, foundation: state.sourceFoundation },
      target: { type: targetType, index: targetIndex, foundation: targetFoundation },
      timestamp: Date.now()
    });
    
    if (!state.isDragging) {
      console.log('⚠️ Not in dragging state, ignoring drop');
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
      targetFoundation,
      get().addPointsToProgress,
      get().addFloatingScore,
      null // No specific card position for drag operations
    );
    
    if (newGameState) {
      console.log('✅ Move successful, updating game state');
      set({
        ...newGameState,
        isDragging: false,
        draggedCards: [],
        sourceType: 'tableau',
        sourceIndex: undefined,
        sourceFoundation: undefined,
        showDragPreview: false,
        dragPreviewPosition: null
      });
    } else {
      console.log('❌ Move failed, invalid move attempted');
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
    
    // console.log(`🔍 canAutoMoveToFoundation: checking ${card.suit}-${card.rank}, foundation length: ${foundationCards.length}`);
    
    if (foundationCards.length === 0 && card.rank === 'A') {
      // console.log(`✅ canAutoMoveToFoundation: A can be moved to empty foundation ${suit}`);
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
  
  autoMoveToFoundation: (card, suit, startElement, endElement) => {
    // console.log(`🚀 autoMoveToFoundation: moving ${card.suit}-${card.rank} to foundation ${suit}`);
    
    // Store start position for floating score
    let cardStartPosition = null;
    if (startElement) {
      const startRect = startElement.getBoundingClientRect();
      cardStartPosition = { x: startRect.left + startRect.width / 2, y: startRect.top };
    }
    
    // If we have DOM elements, trigger animation
    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      
      set({
        animatingCard: {
          card,
          startPosition: { x: startRect.left, y: startRect.top },
          endPosition: { x: endRect.left, y: endRect.top },
          targetSuit: suit,
          cardStartPosition // Add card start position for floating score
        }
      });
    } else {
      // No animation, move immediately
      get().completeCardAnimation(card, suit, cardStartPosition);
    }
  },
  
  completeCardAnimation: (card, suit, cardStartPosition = null) => {
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
      suit,
      get().addPointsToProgress,
      get().addFloatingScore,
      cardStartPosition
    );
    
    if (newGameState) {
      set({ ...newGameState, animatingCard: null });
    } else {
      set({ animatingCard: null });
    }
  },
  
  addPointsToProgress: (points: number) => {
    addPointsToProgress(points);
  },
  
  onGiftEarned: (gifts: number) => {
    set({ totalGifts: gifts });
    console.log(`🎁 Gift earned! Total gifts: ${gifts}`);
  },
  
  addFloatingScore: (points: number, x: number, y: number, cardRank: string) => {
    import('../solitaire/floatingScoreManager').then(({ addFloatingScore }) => {
      addFloatingScore(points, x, y, cardRank);
    });
  }
}));
