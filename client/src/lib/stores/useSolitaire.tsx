import { create } from 'zustand';
import { GameState, DragState, Card, Suit } from '../solitaire/types';
import { initializeGame, drawFromStock, moveCards, getMovableCards } from '../solitaire/gameLogic';
import { canPlaceOnTableau } from '../solitaire/cardUtils';
import { clearAllDropTargetHighlights } from '../solitaire/styleManager';
import { calculateCardPoints, calculateCardPointsRaw, resetScoredCards } from '../solitaire/scoring';
import { addFloatingScore } from '../solitaire/floatingScoreManager';
import GameIntegration from '../gameIntegration';
import { generateSolvableGame, generateUnsolvableGame } from '../solitaire/solvableGenerator';
import { awardWinXP, awardCardXP, resetXPEarnedCards } from '../solitaire/experienceManager';

// Track cards currently being auto-collected to prevent duplicates
const autoCollectingCards = new Set<string>();

function clearAutoCollectingCards() {
  autoCollectingCards.clear();
}

interface AnimatingCard {
  card: Card;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  targetSuit: Suit;
  cardStartPosition?: { x: number; y: number } | null;
  isReturnAnimation?: boolean; // Flag to indicate this is a return animation (failed drop)
  isTableauMove?: boolean; // Flag to indicate this is a move to tableau (not foundation)
  targetTableauColumn?: number; // Target column index for tableau moves
  isStackMove?: boolean; // Flag to indicate this is a stack move (multiple cards)
  stackCards?: Card[]; // All cards in the stack for stack moves
  sourceTableauColumn?: number; // Source column for stack moves
  isNearComplete?: boolean; // Flag to indicate animation is near completion (95%+) - cards should start appearing
}

interface SolitaireStore extends GameState, DragState {
  // Game actions
  newGame: (mode?: 'random' | 'solvable' | 'unsolvable') => void;
  drawCard: () => void;
  
  // Drag and drop actions
  startDrag: (cards: Card[], sourceType: 'tableau' | 'waste' | 'foundation', sourceIndex?: number, sourceFoundation?: Suit) => void;
  endDrag: () => void;
  dropCards: (targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void;
  
  // Animation state
  animatingCard: AnimatingCard | null;
  setAnimatingCard: (card: AnimatingCard | null) => void;
  setAnimationNearComplete: () => void; // Mark animation as near complete (95%)
  
  // Stock pile animation state
  isStockAnimating: boolean;
  setStockAnimating: (animating: boolean) => void;
  
  // Drag preview state
  showDragPreview: boolean;
  dragPreviewPosition: { x: number; y: number } | null;
  dragOffset: { x: number; y: number } | null;
  setShowDragPreview: (show: boolean, position?: { x: number; y: number }, offset?: { x: number; y: number }) => void;
  
  // Debug settings
  collisionHighlightEnabled: boolean;
  setCollisionHighlight: (enabled: boolean) => void;
  
  // Foundation slot order (tracks which suits are assigned to which visual slots 0-3)
  foundationSlotOrder: Suit[];
  
  // Utility functions
  getMovableCardsFromTableau: (columnIndex: number) => Card[];
  canAutoMoveToFoundation: (card: Card) => Suit | null;
  autoMoveToFoundation: (card: Card, suit: Suit, startElement?: HTMLElement, endElement?: HTMLElement, speed?: number) => void;
  findTableauPlacementForCard: (card: Card) => number | null; // Returns column index or null
  autoMoveToTableau: (card: Card, targetColumnIndex: number, startElement?: HTMLElement) => void;
  autoMoveStackToTableau: (cards: Card[], sourceColumnIndex: number, targetColumnIndex: number, startElement?: HTMLElement) => void;
  completeCardAnimation: (card: Card, suit: Suit, cardStartPosition?: { x: number; y: number } | null) => void;
  
  // Auto-collect functionality
  isAutoCollecting: boolean;
  triggerAutoCollect: () => void;
  collectAllAvailable: () => void; // Collect all available cards to foundation (double-click)
  stopAutoCollect: () => void;
  
  // No moves detection
  hasNoMoves: boolean;
  checkForAvailableMoves: () => boolean;
  clearNoMoves: () => void;
  
  // Hint system
  hint: { type: 'foundation' | 'tableau' | 'stock' | 'waste'; cardId?: string; from?: number; to?: number | string } | null;
  getHint: () => void;
  clearHint: () => void;
  
  // Dealing animation
  isDealing: boolean;
  dealingCardIds: Set<string>; // Cards that should animate during deal
  
  // Progress bar functions
  addPointsToProgress: (points: number) => void;
  onGiftEarned: (gifts: number) => void;
  
  // Floating scores functions
  addFloatingScore: (points: number, x: number, y: number, cardRank: string, isPremium?: boolean) => void;
  
  // Lobby integration
  getCurrentResults: () => { score: number; giftsEarned: number };
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
  
  // Stock pile animation state
  isStockAnimating: false,
  
  // Drag preview state
  showDragPreview: false,
  dragPreviewPosition: null,
  dragOffset: null,
  
  // Debug settings
  collisionHighlightEnabled: false,
  
  // Foundation slot order (empty at start, fills left to right as suits are added)
  foundationSlotOrder: [],
  
  // Auto-collect state
  isAutoCollecting: false,
  
  // No moves state
  hasNoMoves: false,
  
  // Hint state
  hint: null,
  
  // Dealing animation state
  isDealing: true, // Start with dealing animation
  dealingCardIds: new Set<string>(), // Will be populated in newGame
  
  setCollisionHighlight: (enabled) => {
    set({ collisionHighlightEnabled: enabled });
  },
  
  setStockAnimating: (animating) => {
    set({ isStockAnimating: animating });
  },
  
  newGame: (mode: 'random' | 'solvable' | 'unsolvable' = 'solvable') => {
    const newGameState = mode === 'solvable' 
      ? generateSolvableGame() 
      : mode === 'unsolvable'
      ? generateUnsolvableGame()
      : initializeGame();
    resetScoredCards(); // Reset scored cards for new game
    resetXPEarnedCards(); // Reset XP tracking for new game
    clearAutoCollectingCards(); // Reset auto-collecting cards tracker
    set({
      ...newGameState,
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined,
      animatingCard: null,
      foundationSlotOrder: [], // Reset slot order for new game
      isAutoCollecting: false, // Reset auto-collect state
      hasNoMoves: false, // Reset no moves state
      hint: null, // Clear hint
      isDealing: true, // Start dealing animation
      dealingCardIds: new Set(newGameState.tableau.flat().map(c => c.id)) // Only these cards animate
    });
    
    // End dealing animation after cards have animated in
    setTimeout(() => {
      set({ isDealing: false, dealingCardIds: new Set() });
    }, 1000);
    
    // Trigger premium cards reveal animation immediately
    // COMMENTED OUT: Premium cards logic disabled
    /*
    setTimeout(async () => {
      const { getPremiumCardsFromTableau, animatePremiumCardsReveal } = await import('../solitaire/premiumCardsAnimation');
      const premiumCards = getPremiumCardsFromTableau(newGameState.tableau);
      
      if (premiumCards.length > 0) {
        console.log(`🎮 Starting premium cards reveal for ${premiumCards.length} cards`);
        await animatePremiumCardsReveal(premiumCards, 100);
      }
    }, 0); // Start animation immediately after game starts
    */
  },
  
  setAnimatingCard: (card) => {
    set({ animatingCard: card });
  },
  
  setAnimationNearComplete: () => {
    const state = get();
    if (state.animatingCard) {
      set({ 
        animatingCard: { 
          ...state.animatingCard, 
          isNearComplete: true 
        } 
      });
    }
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
    
    // Trigger auto-collect after drawing from stock
    setTimeout(() => {
      get().triggerAutoCollect();
    }, 10);
    
    // Check for available moves after stock action
    setTimeout(() => {
      const state = get();
      if (!state.isWon && !state.hasNoMoves && !state.isAutoCollecting) {
        get().checkForAvailableMoves();
      }
    }, 200);
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
    const state = get();
    
    // If we were dragging cards, animate them back to their source
    if (state.isDragging && state.draggedCards.length > 0) {
      const dragPreview = document.querySelector('[data-drag-preview]') as HTMLElement;
      if (dragPreview) {
        const previewRect = dragPreview.getBoundingClientRect();
        
        // Find source position - need to find the actual card element
        let sourceElement: HTMLElement | null = null;
        const firstDraggedCard = state.draggedCards[0];
        
        if (state.sourceType === 'waste') {
          sourceElement = document.querySelector('[data-waste-pile]') as HTMLElement;
        } else if (state.sourceType === 'tableau' && state.sourceIndex !== undefined) {
          // Find the specific card element in the tableau column
          sourceElement = document.querySelector(`[data-card-id="${firstDraggedCard.id}"]`) as HTMLElement;
        } else if (state.sourceType === 'foundation' && state.sourceFoundation) {
          sourceElement = document.querySelector(`[data-foundation-pile="${state.sourceFoundation}"]`) as HTMLElement;
        }
        
        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          
          // Animate return with full stack if multiple cards
          set({
            animatingCard: {
              card: state.draggedCards[0],
              startPosition: { x: previewRect.left, y: previewRect.top },
              endPosition: { x: sourceRect.left, y: sourceRect.top },
              targetSuit: state.draggedCards[0].suit,
              cardStartPosition: null,
              isReturnAnimation: true,
              stackCards: state.draggedCards.length > 1 ? state.draggedCards : undefined, // Include stack for multi-card return
              sourceTableauColumn: state.sourceIndex // For proper rendering
            },
            isDragging: false,
            draggedCards: [],
            showDragPreview: false,
            dragPreviewPosition: null,
            dragOffset: null
          });
          
          // Clear visual feedback
          clearAllDropTargetHighlights();
          return;
        }
      }
    }
    
    // Fallback: Clear all visual feedback and state immediately
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
    
    if (!state.isDragging) {
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
      // If dropped to foundation, trigger collection item drop from foundation position
      if (targetType === 'foundation' && targetFoundation && state.draggedCards.length > 0) {
        const foundationElement = document.querySelector(`[data-foundation-pile="${targetFoundation}"]`) as HTMLElement;
        if (foundationElement) {
          const rect = foundationElement.getBoundingClientRect();
          const dropX = rect.left + rect.width / 2;
          const dropY = rect.top + rect.height / 2;
          import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
            triggerCardToFoundation(dropX, dropY);
          });
        }
      }
      
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
      
      // Check if game is won and notify lobby
      if (newGameState.isWon && !get().isWon) {
        // Award XP for winning
        awardWinXP();
        
        const gameTime = newGameState.startTime ? 
          Math.floor((Date.now() - newGameState.startTime.getTime()) / 1000) : 0;
        
        // Calculate total score based on cards in foundations
        let totalScore = 0;
        Object.values(newGameState.foundations).forEach(foundation => {
          foundation.forEach(card => {
            totalScore += calculateCardPoints(card);
          });
        });
        
        GameIntegration.getInstance().onGameEnd(totalScore, gameTime, newGameState.totalGifts);
      }
      
      // Trigger auto-collect ONLY if not moving from foundation back to tableau
      // (player is intentionally taking card back, don't interfere)
      const isMovingFromFoundation = state.sourceType === 'foundation';
      if (!isMovingFromFoundation) {
        setTimeout(() => {
          get().triggerAutoCollect();
        }, 100); // Small delay to let state update
      }
    } else {
      // Find source element for return animation
      const dragPreview = document.querySelector('[data-drag-preview]') as HTMLElement;
      if (dragPreview && state.draggedCards.length > 0) {
        const previewRect = dragPreview.getBoundingClientRect();
        
        // Find source position - need to find the actual card element, not just the container
        let sourceElement: HTMLElement | null = null;
        const firstDraggedCard = state.draggedCards[0];
        
        if (state.sourceType === 'waste') {
          sourceElement = document.querySelector('[data-waste-pile]') as HTMLElement;
        } else if (state.sourceType === 'tableau' && state.sourceIndex !== undefined) {
          // Find the specific card element in the tableau column
          sourceElement = document.querySelector(`[data-card-id="${firstDraggedCard.id}"]`) as HTMLElement;
        } else if (state.sourceType === 'foundation' && state.sourceFoundation) {
          sourceElement = document.querySelector(`[data-foundation-pile="${state.sourceFoundation}"]`) as HTMLElement;
        }
        
        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          
          // Animate return with full stack if multiple cards
          set({
            animatingCard: {
              card: state.draggedCards[0],
              startPosition: { x: previewRect.left, y: previewRect.top },
              endPosition: { x: sourceRect.left, y: sourceRect.top },
              targetSuit: state.draggedCards[0].suit,
              cardStartPosition: null,
              isReturnAnimation: true,
              stackCards: state.draggedCards.length > 1 ? state.draggedCards : undefined, // Include stack for multi-card return
              sourceTableauColumn: state.sourceIndex // For proper rendering
            },
            isDragging: false,
            draggedCards: [],
            showDragPreview: false,
            dragPreviewPosition: null
          });
          
          // After animation completes, it will call completeCardAnimation
          // which will try to move the card, but since it's already in place, nothing happens
          return;
        }
      }
      
      // Fallback: just end drag without animation
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
  
  autoMoveToFoundation: (card, suit, startElement, endElement, speed = 75) => {
    // Check if card is already being auto-collected to prevent duplicates
    if (autoCollectingCards.has(card.id)) {
      return; // Skip - already in progress
    }
    autoCollectingCards.add(card.id);
    
    // CAPTURE start position BEFORE removing card from DOM
    let savedStartRect: DOMRect | null = null;
    if (startElement) {
      savedStartRect = startElement.getBoundingClientRect();
      
      // Trigger flying suit icon and floating score immediately
      const centerX = savedStartRect.left + savedStartRect.width / 2;
      const centerY = savedStartRect.top + savedStartRect.height / 2;
      
      import('../flyingSuitIconManager').then(({ addFlyingSuitIcon }) => {
        addFlyingSuitIcon(card.suit, centerX, centerY);
      });
      
      const scoreX = savedStartRect.left - 20;
      const scoreY = savedStartRect.top + savedStartRect.height / 2;
      import('../solitaire/scoring').then(({ CARD_POINTS }) => {
        const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
        get().addFloatingScore(points, scoreX, scoreY, card.rank, card.isPremium);
      });
    }
    
    // NOW remove card from tableau AND flip the card underneath
    const state = get();
    let cardRemovedFromTableau = false;
    
    for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
      const column = state.tableau[colIndex];
      if (column.length > 0 && column[column.length - 1].id === card.id) {
        const newTableau = [...state.tableau];
        newTableau[colIndex] = column.slice(0, -1);
        
        if (newTableau[colIndex].length > 0 && !newTableau[colIndex][newTableau[colIndex].length - 1].faceUp) {
          newTableau[colIndex] = [...newTableau[colIndex]];
          newTableau[colIndex][newTableau[colIndex].length - 1] = { 
            ...newTableau[colIndex][newTableau[colIndex].length - 1], 
            faceUp: true 
          };
        }
        set({ tableau: newTableau });
        cardRemovedFromTableau = true;
        break;
      }
    }
    
    if (!cardRemovedFromTableau && state.waste.length > 0 && state.waste[state.waste.length - 1].id === card.id) {
      set({ waste: state.waste.slice(0, -1) });
    }
    
    // Helper to start animation
    const startAnimation = (targetEndElement: HTMLElement) => {
      if (!savedStartRect) {
        get().completeCardAnimation(card, suit, null);
        return;
      }
      
      const endRect = targetEndElement.getBoundingClientRect();
      
      set({
        animatingCard: {
          card,
          startPosition: { x: savedStartRect.left, y: savedStartRect.top },
          endPosition: { x: endRect.left, y: endRect.top },
          targetSuit: suit,
          cardStartPosition: { x: savedStartRect.left - 20, y: savedStartRect.top + savedStartRect.height / 2 },
          speed
        }
      });
    };
    
    // Reserve slot for this suit if not already reserved
    // Check with latest state to avoid race conditions when multiple cards move simultaneously
    const latestOrder = get().foundationSlotOrder;
    if (!latestOrder.includes(suit)) {
      // Add suit to order - get fresh state again in case it changed
      const freshOrder = get().foundationSlotOrder;
      if (!freshOrder.includes(suit)) {
        set({ foundationSlotOrder: [...freshOrder, suit] });
      }
      
      // Wait for DOM update, then start animation
      setTimeout(() => {
        const updatedEndElement = document.querySelector(`[data-foundation-pile="${suit}"]`) as HTMLElement;
        if (!updatedEndElement) {
          autoCollectingCards.delete(card.id);
          return;
        }
        startAnimation(updatedEndElement);
      }, 0);
      return;
    }
    
    // Suit already has a slot
    if (endElement) {
      startAnimation(endElement);
    } else {
      get().completeCardAnimation(card, suit, null);
    }
  },
  
  findTableauPlacementForCard: (card) => {
    const state = get();
    
    // Try each tableau column to find a valid placement
    for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
      const column = state.tableau[colIndex];
      
      // If column is empty, only King can be placed
      if (column.length === 0) {
        if (card.rank === 'K') {
          return colIndex;
        }
        continue;
      }
      
      // Check if card can be placed on the last card in the column
      const lastCard = column[column.length - 1];
      const canPlace = canPlaceOnTableau(lastCard, card); // lastCard is bottom (target), card is top (being placed)
      
      if (lastCard.faceUp && canPlace) {
        return colIndex;
      }
    }
    
    return null; // No valid placement found
  },
  
  autoMoveToTableau: (card, targetColumnIndex, startElement) => {
    const state = get();
    const targetColumn = state.tableau[targetColumnIndex];
    
    // Immediately flip the card underneath in source tableau column
    for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
      const column = state.tableau[colIndex];
      if (column.length > 0 && column[column.length - 1].id === card.id) {
        // Found the card - flip the one underneath if exists and face down
        if (column.length > 1 && !column[column.length - 2].faceUp) {
          const newTableau = [...state.tableau];
          newTableau[colIndex] = [...column];
          newTableau[colIndex][column.length - 2] = { 
            ...newTableau[colIndex][column.length - 2], 
            faceUp: true 
          };
          set({ tableau: newTableau });
        }
        break;
      }
    }
    
    // Find target element - if column has cards, find the last card, otherwise use the column container
    let endElement: HTMLElement | null = null;
    
    if (targetColumn.length > 0) {
      // Find the last card in the target column
      const lastCard = targetColumn[targetColumn.length - 1];
      endElement = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
    } else {
      // Column is empty, use the column container
      endElement = document.querySelector(`[data-tableau-column="${targetColumnIndex}"]`) as HTMLElement;
    }
    
    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      
      // Calculate vertical offset for the new card position
      // Card should land BELOW the last card, not ON it
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      let baseOffset = 0;
      
      if (targetColumn.length > 0) {
        const lastCard = targetColumn[targetColumn.length - 1];
        // Use smart spacing: more for face-up cards, less for face-down
        if (isMobile) {
          baseOffset = lastCard.faceUp ? 28 : 12;
        } else {
          baseOffset = lastCard.faceUp ? 24 : 8;
        }
      }
      
      // Get scale from the game board container
      const gameBoard = document.querySelector('[data-game-board]') as HTMLElement;
      const scale = gameBoard ? parseFloat(gameBoard.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1') : 1;
      
      // Apply scale to the offset
      const verticalOffset = baseOffset * scale;
      
      // For animation to tableau, we don't need cardStartPosition (no points scored)
      // Use requestAnimationFrame to let React render the flip first
      requestAnimationFrame(() => {
        set({
          animatingCard: {
            card,
            startPosition: { x: startRect.left, y: startRect.top },
            endPosition: { x: endRect.left, y: endRect.top + verticalOffset },
            targetSuit: card.suit, // Use card's own suit (not moving to foundation)
            cardStartPosition: null,
            isTableauMove: true, // Flag to indicate this is a tableau move
            targetTableauColumn: targetColumnIndex // Store target column
          }
        });
      });
    } else {
      // No animation, move immediately by using moveCards
      const state = get();
      
      // Find source
      let sourceType: 'tableau' | 'waste' | 'foundation' = 'waste';
      let sourceIndex: number | undefined;
      let sourceFoundation: Suit | undefined;
      
      // Check waste pile
      if (state.waste.length > 0 && state.waste[state.waste.length - 1].id === card.id) {
        sourceType = 'waste';
      } else {
        // Check tableau
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
        'tableau',
        targetColumnIndex,
        undefined,
        get().addPointsToProgress,
        get().addFloatingScore,
        null
      );
      
      if (newGameState) {
        set(newGameState);
      }
    }
  },
  
  autoMoveStackToTableau: (cards, sourceColumnIndex, targetColumnIndex, startElement) => {
    const state = get();
    const targetColumn = state.tableau[targetColumnIndex];
    
    // Immediately flip the card underneath in source tableau column
    const sourceColumn = state.tableau[sourceColumnIndex];
    const bottomCardIndex = sourceColumn.findIndex(c => c.id === cards[0].id);
    if (bottomCardIndex > 0 && !sourceColumn[bottomCardIndex - 1].faceUp) {
      const newTableau = [...state.tableau];
      newTableau[sourceColumnIndex] = [...sourceColumn];
      newTableau[sourceColumnIndex][bottomCardIndex - 1] = { 
        ...newTableau[sourceColumnIndex][bottomCardIndex - 1], 
        faceUp: true 
      };
      set({ tableau: newTableau });
    }
    
    // Find target element - if column has cards, find the last card, otherwise use the column container
    let endElement: HTMLElement | null = null;
    
    if (targetColumn.length > 0) {
      // Find the last card in the target column
      const lastCard = targetColumn[targetColumn.length - 1];
      endElement = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
    } else {
      // Column is empty, use the column container
      endElement = document.querySelector(`[data-tableau-column="${targetColumnIndex}"]`) as HTMLElement;
    }
    
    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      
      // Calculate vertical offset for the new card position
      // Card should land BELOW the last card, not ON it
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      let baseOffset = 0;
      
      if (targetColumn.length > 0) {
        const lastCard = targetColumn[targetColumn.length - 1];
        // Use smart spacing: more for face-up cards, less for face-down
        if (isMobile) {
          baseOffset = lastCard.faceUp ? 28 : 12;
        } else {
          baseOffset = lastCard.faceUp ? 24 : 8;
        }
      }
      
      // Get scale from the game board container
      const gameBoard = document.querySelector('[data-game-board]') as HTMLElement;
      const scale = gameBoard ? parseFloat(gameBoard.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1') : 1;
      
      // Apply scale to the offset
      const verticalOffset = baseOffset * scale;
      
      // Animate the bottom card of the stack
      // Use requestAnimationFrame to let React render the flip first
      requestAnimationFrame(() => {
        set({
          animatingCard: {
            card: cards[0], // Bottom card of the stack
            startPosition: { x: startRect.left, y: startRect.top },
            endPosition: { x: endRect.left, y: endRect.top + verticalOffset },
            targetSuit: cards[0].suit,
            cardStartPosition: null,
            isTableauMove: true,
            targetTableauColumn: targetColumnIndex,
            isStackMove: true, // Flag to indicate this is a stack move
            stackCards: cards, // All cards in the stack
            sourceTableauColumn: sourceColumnIndex // Source column
          }
        });
      });
    } else {
      // No animation, move immediately
      const newGameState = moveCards(
        state,
        cards,
        'tableau',
        sourceColumnIndex,
        undefined,
        'tableau',
        targetColumnIndex,
        undefined,
        get().addPointsToProgress,
        get().addFloatingScore,
        null
      );
      
      if (newGameState) {
        set(newGameState);
      }
    }
  },

  
  completeCardAnimation: (card, suit, cardStartPosition = null) => {
    const state = get();
    const animating = state.animatingCard;
    
    // Check if this is a return animation (failed drop) - just clear animation state
    if (animating?.isReturnAnimation) {
      set({ animatingCard: null });
      return;
    }
    
    // Check if this is a tableau move
    if (animating?.isTableauMove && animating.targetTableauColumn !== undefined) {
      // Check if this is a stack move
      if (animating.isStackMove && animating.stackCards && animating.sourceTableauColumn !== undefined) {
        const newGameState = moveCards(
          state,
          animating.stackCards,
          'tableau',
          animating.sourceTableauColumn,
          undefined,
          'tableau',
          animating.targetTableauColumn,
          undefined,
          get().addPointsToProgress,
          get().addFloatingScore,
          null // No points for tableau moves
        );
        
        if (newGameState) {
          set({ ...newGameState, animatingCard: null });
        } else {
          set({ animatingCard: null });
        }
        return;
      }
      
      // Single card move
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
        'tableau',
        animating.targetTableauColumn,
        undefined,
        get().addPointsToProgress,
        get().addFloatingScore,
        null // No points for tableau moves
      );
      
      if (newGameState) {
        set({ ...newGameState, animatingCard: null });
      } else {
        set({ animatingCard: null });
      }
      return;
    }
    
    // Default: foundation move
    // Card was already removed from tableau/waste in autoMoveToFoundation
    // Just add it directly to foundation
    
    // Remove card from auto-collecting tracking
    autoCollectingCards.delete(card.id);
    
    // Add card to foundation directly
    const newFoundations = { ...state.foundations };
    newFoundations[suit] = [...(newFoundations[suit] || []), card];
    
    // Check if game is won (all 52 cards in foundations)
    const totalInFoundations = Object.values(newFoundations).reduce((sum, f) => sum + f.length, 0);
    const isWon = totalInFoundations === 52;
    
    // Trigger collection item drop NOW when card arrives at foundation
    const foundationElement = document.querySelector(`[data-foundation-pile="${suit}"]`) as HTMLElement;
    if (foundationElement) {
      const rect = foundationElement.getBoundingClientRect();
      const dropX = rect.left + rect.width / 2;
      const dropY = rect.top + rect.height / 2;
      import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
        triggerCardToFoundation(dropX, dropY);
      });
    }
    
    // Award XP for card
    awardCardXP(card.id);
    
    set({ 
      foundations: newFoundations, 
      isWon,
      moves: state.moves + 1,
      animatingCard: null 
    });
    
    // Check if game is won and notify lobby
    if (isWon && !state.isWon) {
      // Award XP for winning
      awardWinXP();
      
      const gameTime = state.startTime ? 
        Math.floor((Date.now() - state.startTime.getTime()) / 1000) : 0;
      
      // Calculate total score based on cards in foundations
      let totalScore = 0;
      Object.values(newFoundations).forEach(foundation => {
        foundation.forEach(c => {
          totalScore += calculateCardPoints(c);
        });
      });
      
      GameIntegration.getInstance().onGameEnd(totalScore, gameTime, state.totalGifts);
    }
    
    // Trigger auto-collect after animation completes
    setTimeout(() => {
      get().triggerAutoCollect();
    }, 10);
    
    // Check for available moves after animation completes
    setTimeout(() => {
      const currentState = get();
      if (!currentState.isWon && !currentState.hasNoMoves && !currentState.isAutoCollecting) {
        get().checkForAvailableMoves();
      }
    }, 200);
  },
  
  addPointsToProgress: (_points: number) => {
    // Points are handled by the progress bar component directly
    // This function is called by game logic but actual display is managed by DonationProgress
  },
  
  onGiftEarned: (gifts: number) => {
    set({ totalGifts: gifts });
  },
  
  addFloatingScore: (points: number, x: number, y: number, cardRank: string, isPremium?: boolean) => {
    import('../solitaire/floatingScoreManager').then(({ addFloatingScore }) => {
      addFloatingScore(points, x, y, cardRank, isPremium);
    });
  },
  
  getCurrentResults: () => {
    const state = get();
    
    // Calculate current score based on cards in foundations (without tracking)
    let currentScore = 0;
    Object.values(state.foundations).forEach(foundation => {
      foundation.forEach(card => {
        currentScore += calculateCardPointsRaw(card);
      });
    });
    
    return {
      score: currentScore,
      giftsEarned: state.totalGifts
    };
  },
  
  stopAutoCollect: () => {
    set({ isAutoCollecting: false });
  },
  
  clearNoMoves: () => {
    set({ hasNoMoves: false });
  },
  
  clearHint: () => {
    set({ hint: null });
  },
  
  getHint: () => {
    const state = get();
    
    // Clear previous hint
    set({ hint: null });
    
    // Don't give hints if game is won
    if (state.isWon) return;
    
    // Priority 1: Card that can go to foundation
    for (let i = 0; i < state.tableau.length; i++) {
      const column = state.tableau[i];
      if (column.length > 0) {
        const topCard = column[column.length - 1];
        if (topCard.faceUp) {
          const targetSuit = get().canAutoMoveToFoundation(topCard);
          if (targetSuit) {
            set({ hint: { type: 'foundation', cardId: topCard.id, from: i, to: targetSuit } });
            return;
          }
        }
      }
    }
    
    // Check waste for foundation move
    if (state.waste.length > 0) {
      const wasteTop = state.waste[state.waste.length - 1];
      const targetSuit = get().canAutoMoveToFoundation(wasteTop);
      if (targetSuit) {
        set({ hint: { type: 'foundation', cardId: wasteTop.id, to: targetSuit } });
        return;
      }
    }
    
    // Priority 2: Move that reveals a face-down card
    for (let srcCol = 0; srcCol < state.tableau.length; srcCol++) {
      const srcColumn = state.tableau[srcCol];
      const faceDownCount = srcColumn.filter(c => !c.faceUp).length;
      if (faceDownCount === 0) continue;
      
      const firstFaceUpIdx = srcColumn.findIndex(c => c.faceUp);
      if (firstFaceUpIdx === -1) continue;
      
      const cardToMove = srcColumn[firstFaceUpIdx];
      
      for (let dstCol = 0; dstCol < state.tableau.length; dstCol++) {
        if (srcCol === dstCol) continue;
        
        const dstColumn = state.tableau[dstCol];
        if (dstColumn.length === 0) {
          if (cardToMove.rank === 'K' && firstFaceUpIdx > 0) {
            set({ hint: { type: 'tableau', cardId: cardToMove.id, from: srcCol, to: dstCol } });
            return;
          }
        } else {
          const dstTop = dstColumn[dstColumn.length - 1];
          if (dstTop.faceUp && canPlaceOnTableau(dstTop, cardToMove)) {
            set({ hint: { type: 'tableau', cardId: cardToMove.id, from: srcCol, to: dstCol } });
            return;
          }
        }
      }
    }
    
    // Priority 2.5: Move between tableau columns that enables a foundation move
    // Check if moving a card/stack reveals a card that can go to foundation
    for (let srcCol = 0; srcCol < state.tableau.length; srcCol++) {
      const srcColumn = state.tableau[srcCol];
      if (srcColumn.length < 2) continue; // Need at least 2 cards
      
      // Check each face-up card in the column
      for (let cardIdx = 0; cardIdx < srcColumn.length; cardIdx++) {
        const card = srcColumn[cardIdx];
        if (!card.faceUp) continue;
        
        // What card would be revealed/exposed if we move this stack?
        const cardBelow = cardIdx > 0 ? srcColumn[cardIdx - 1] : null;
        if (!cardBelow || !cardBelow.faceUp) continue; // Only check if card below is face-up
        
        // Can the card below go to foundation after we move the stack?
        const canCardBelowGoToFoundation = get().canAutoMoveToFoundation(cardBelow);
        if (!canCardBelowGoToFoundation) continue;
        
        // Now check if we can actually move this stack somewhere
        for (let dstCol = 0; dstCol < state.tableau.length; dstCol++) {
          if (srcCol === dstCol) continue;
          
          const dstColumn = state.tableau[dstCol];
          if (dstColumn.length === 0) {
            if (card.rank === 'K') {
              set({ hint: { type: 'tableau', cardId: card.id, from: srcCol, to: dstCol } });
              return;
            }
          } else {
            const dstTop = dstColumn[dstColumn.length - 1];
            if (dstTop.faceUp && canPlaceOnTableau(dstTop, card)) {
              set({ hint: { type: 'tableau', cardId: card.id, from: srcCol, to: dstCol } });
              return;
            }
          }
        }
      }
    }
    
    // Priority 3: Waste to tableau
    if (state.waste.length > 0) {
      const wasteTop = state.waste[state.waste.length - 1];
      for (let col = 0; col < state.tableau.length; col++) {
        const column = state.tableau[col];
        if (column.length === 0) {
          if (wasteTop.rank === 'K') {
            set({ hint: { type: 'waste', cardId: wasteTop.id, to: col } });
            return;
          }
        } else {
          const colTop = column[column.length - 1];
          if (colTop.faceUp && canPlaceOnTableau(colTop, wasteTop)) {
            set({ hint: { type: 'waste', cardId: wasteTop.id, to: col } });
            return;
          }
        }
      }
    }
    
    // Priority 4: Check if drawing from stock would help
    // Only suggest if there are cards in stock/waste that could actually be used
    const allStockWasteCards = [...state.stock, ...state.waste];
    let hasUsefulCardInDeck = false;
    
    for (const card of allStockWasteCards) {
      // Can this card go to foundation?
      if (get().canAutoMoveToFoundation(card)) {
        hasUsefulCardInDeck = true;
        break;
      }
      // Can this card go to any tableau column?
      for (let col = 0; col < state.tableau.length; col++) {
        const column = state.tableau[col];
        if (column.length === 0) {
          if (card.rank === 'K') {
            hasUsefulCardInDeck = true;
            break;
          }
        } else {
          const topCard = column[column.length - 1];
          if (topCard.faceUp && canPlaceOnTableau(topCard, card)) {
            hasUsefulCardInDeck = true;
            break;
          }
        }
      }
      if (hasUsefulCardInDeck) break;
    }
    
    // If there's a useful card anywhere in stock/waste - hint to cycle through deck
    if (hasUsefulCardInDeck) {
      // Show hint to draw/recycle - stock or recycle icon
      set({ hint: { type: 'stock' } });
      return;
    }
    
    // Before showing "no moves" - check if there are face-down cards that can still be revealed
    // If player can still make tableau-to-tableau moves to reveal cards, don't show "no moves"
    const hasFaceDownCards = state.tableau.some(col => col.some(c => !c.faceUp));
    
    if (hasFaceDownCards) {
      // Check if ANY tableau-to-tableau move is possible (not just revealing moves)
      for (let srcCol = 0; srcCol < state.tableau.length; srcCol++) {
        const srcColumn = state.tableau[srcCol];
        if (srcColumn.length === 0) continue;
        
        // Check each face-up card stack
        for (let cardIdx = 0; cardIdx < srcColumn.length; cardIdx++) {
          const card = srcColumn[cardIdx];
          if (!card.faceUp) continue;
          
          for (let dstCol = 0; dstCol < state.tableau.length; dstCol++) {
            if (srcCol === dstCol) continue;
            
            const dstColumn = state.tableau[dstCol];
            if (dstColumn.length === 0) {
              // Can move King to empty column (only useful if it reveals a card)
              if (card.rank === 'K' && cardIdx > 0) {
                // There's a move that reveals a card - don't show no moves
                return;
              }
            } else {
              const dstTop = dstColumn[dstColumn.length - 1];
              if (dstTop.faceUp && canPlaceOnTableau(dstTop, card)) {
                // Check if this move would reveal a face-down card
                if (cardIdx > 0 && !srcColumn[cardIdx - 1].faceUp) {
                  // This move reveals a card - don't show no moves
                  return;
                }
              }
            }
          }
        }
      }
    }
    
    // No useful moves at all - show no moves popup
    set({ hasNoMoves: true });
  },
  
  // Check if there are any available moves
  // Uses the same logic as getHint() to ensure consistency
  checkForAvailableMoves: () => {
    const state = get();
    
    // Don't check if game is won or auto-collecting
    if (state.isWon || state.isAutoCollecting) return true;
    
    // Clear any previous hint before checking
    const prevHint = state.hint;
    const prevHasNoMoves = state.hasNoMoves;
    
    // Call getHint which will either set a hint (moves available) or set hasNoMoves
    get().getHint();
    
    // Check the result
    const newState = get();
    const hasMovesAvailable = newState.hint !== null || !newState.hasNoMoves;
    
    // If we found a hint, clear it (we just wanted to check, not show hint)
    // But keep hasNoMoves if it was set
    if (newState.hint !== null && prevHint === null) {
      set({ hint: null });
    }
    
    return hasMovesAvailable;
  },
  
  triggerAutoCollect: () => {
    const state = get();
    
    // Check if all cards in tableau are face up (no hidden cards)
    const allTableauCardsRevealed = state.tableau.every(column => 
      column.every(card => card.faceUp)
    );
    
    // Only auto-collect when all tableau cards are revealed
    if (!allTableauCardsRevealed) {
      return;
    }
    
    // Stop if game is won or already auto-collecting
    if (state.isWon || state.isAutoCollecting) {
      return;
    }
    
    // Check if there are any cards that can actually be moved to foundations
    // before setting isAutoCollecting (prevents UI lock when no moves available)
    const canMoveAnyCard = () => {
      const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      const checkCard = (card: Card): boolean => {
        const foundation = state.foundations[card.suit];
        if (card.rank === 'A' && foundation.length === 0) return true;
        if (foundation.length > 0) {
          const topCard = foundation[foundation.length - 1];
          if (rankOrder.indexOf(card.rank) === rankOrder.indexOf(topCard.rank) + 1) return true;
        }
        return false;
      };
      
      // Check tableau top cards
      for (const column of state.tableau) {
        if (column.length > 0 && checkCard(column[column.length - 1])) return true;
      }
      // Check waste
      if (state.waste.length > 0 && checkCard(state.waste[state.waste.length - 1])) return true;
      // Check stock (direct extraction)
      for (const card of state.stock) {
        if (checkCard(card)) return true;
      }
      return false;
    };
    
    if (!canMoveAnyCard()) {
      // No cards can be moved - don't block UI, just return
      return;
    }
    
    // Set auto-collecting state to block user input
    set({ isAutoCollecting: true });
    
    // Animation settings for ~2-3 second total time
    const FLIGHT_DURATION = 150; // Flight time per card
    const STAGGER_DELAY = 40; // Delay between card launches (50 cards * 40ms = 2 sec)
    
    // Collect ALL cards that need to move to foundations
    const cardsToMove: Array<{
      card: Card;
      targetSuit: Suit;
      sourceType: 'tableau' | 'waste' | 'stock';
      sourceIndex?: number;
    }> = [];
    
    // Build a simulation to find card order
    let simTableau = state.tableau.map(col => [...col]);
    let simWaste = [...state.waste];
    let simStock = [...state.stock]; // Include stock cards
    let simFoundations: Record<Suit, Card[]> = {
      hearts: [...state.foundations.hearts],
      diamonds: [...state.foundations.diamonds],
      clubs: [...state.foundations.clubs],
      spades: [...state.foundations.spades]
    };
    
    // Helper to check if card can go to foundation in simulation
    const canMoveToFoundation = (card: Card): Suit | null => {
      const foundation = simFoundations[card.suit];
      if (card.rank === 'A' && foundation.length === 0) return card.suit;
      if (foundation.length > 0) {
        const topCard = foundation[foundation.length - 1];
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        if (rankOrder.indexOf(card.rank) === rankOrder.indexOf(topCard.rank) + 1) {
          return card.suit;
        }
      }
      return null;
    };
    
    // Simulate auto-collect to get all cards in order
    let safetyCounter = 0;
    while (safetyCounter < 100) {
      safetyCounter++;
      let foundCard = false;
      
      // Check tableau columns first
      for (let i = 0; i < simTableau.length; i++) {
        const column = simTableau[i];
        if (column.length > 0) {
          const topCard = column[column.length - 1];
          const suit = canMoveToFoundation(topCard);
          if (suit) {
            cardsToMove.push({ card: topCard, targetSuit: suit, sourceType: 'tableau', sourceIndex: i });
            simTableau[i] = column.slice(0, -1);
            simFoundations[suit] = [...(simFoundations[suit] || []), topCard];
            foundCard = true;
            break;
          }
        }
      }
      
      // Check waste if no tableau card found
      if (!foundCard && simWaste.length > 0) {
        // Check ALL waste cards, not just top
        for (let i = simWaste.length - 1; i >= 0; i--) {
          const wasteCard = simWaste[i];
          const suit = canMoveToFoundation(wasteCard);
          if (suit) {
            cardsToMove.push({ card: wasteCard, targetSuit: suit, sourceType: 'waste' });
            simWaste = simWaste.filter((_, idx) => idx !== i);
            simFoundations[suit] = [...(simFoundations[suit] || []), wasteCard];
            foundCard = true;
            break;
          }
        }
      }
      
      // Check stock if no waste card found - take cards directly without flipping
      if (!foundCard && simStock.length > 0) {
        for (let i = simStock.length - 1; i >= 0; i--) {
          const stockCard = simStock[i];
          const suit = canMoveToFoundation(stockCard);
          if (suit) {
            cardsToMove.push({ card: { ...stockCard, faceUp: true }, targetSuit: suit, sourceType: 'stock' });
            simStock = simStock.filter((_, idx) => idx !== i);
            simFoundations[suit] = [...(simFoundations[suit] || []), stockCard];
            foundCard = true;
            break;
          }
        }
      }
      
      if (!foundCard) break;
    }
    
    if (cardsToMove.length === 0) {
      set({ isAutoCollecting: false });
      return;
    }
    
    // Launch all card animations with staggered delays
    let completedCards = 0;
    const totalCards = cardsToMove.length;
    
    // Track which cards have been removed for state updates
    const movedCardIds = new Set<string>();
    
    cardsToMove.forEach((moveInfo, index) => {
      setTimeout(() => {
        const { card, targetSuit, sourceType, sourceIndex } = moveInfo;
        
        // Check if card can still be added to foundation (state might have changed)
        const stateBeforeAnim = get();
        const foundation = stateBeforeAnim.foundations[targetSuit];
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        let canAdd = false;
        if (card.rank === 'A') {
          canAdd = foundation.length === 0;
        } else if (foundation.length > 0) {
          const topCard = foundation[foundation.length - 1];
          canAdd = rankOrder.indexOf(card.rank) === rankOrder.indexOf(topCard.rank) + 1;
        }
        
        // Skip this card if it can no longer be added
        if (!canAdd) {
          completedCards++;
          if (completedCards >= totalCards) {
            set({ isAutoCollecting: false });
            // Retry auto-collect in case there are other cards to move
            setTimeout(() => {
              const checkState = get();
              if (!checkState.isWon && !checkState.isAutoCollecting) {
                get().triggerAutoCollect();
              }
            }, 100);
          }
          return;
        }
        
        // Get DOM elements FIRST - before updating state
        let cardElement: HTMLElement | null = null;
        let startRect: DOMRect;
        
        if (sourceType === 'stock') {
          // For stock cards, animate from the stock pile position
          const stockPile = document.querySelector('[data-stock-pile]') as HTMLElement;
          if (stockPile) {
            startRect = stockPile.getBoundingClientRect();
          } else {
            completedCards++;
            if (completedCards >= totalCards) set({ isAutoCollecting: false });
            return;
          }
        } else {
          cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
          if (!cardElement) {
            completedCards++;
            if (completedCards >= totalCards) set({ isAutoCollecting: false });
            return;
          }
          startRect = cardElement.getBoundingClientRect();
          // Hide the original card immediately
          cardElement.style.visibility = 'hidden';
        }
        
        const foundationElement = document.querySelector(`[data-foundation-pile="${targetSuit}"]`) as HTMLElement;
        
        if (!foundationElement) {
          completedCards++;
          if (completedCards >= totalCards) set({ isAutoCollecting: false });
          return;
        }
        
        // NOW update foundations - only after all DOM elements are validated
        // Other cards checking canAdd will see this card already in foundation
        const stateForFoundation = get();
        const newFoundations = { ...stateForFoundation.foundations };
        newFoundations[targetSuit] = [...newFoundations[targetSuit], card];
        set({ foundations: newFoundations });
        
        const endRect = foundationElement.getBoundingClientRect();
        
        // Launch flying card animation
        import('../../components/solitaire/FlyingCard').then(({ launchFlyingCard }) => {
          launchFlyingCard({ ...card, faceUp: true }, startRect, endRect, FLIGHT_DURATION, () => {
            movedCardIds.add(card.id);
            completedCards++;
            
            // Update source (remove card) - foundation already updated
            const currentState = get();
            
            if (sourceType === 'tableau' && sourceIndex !== undefined) {
              const newTableau = currentState.tableau.map((col, i) => 
                i === sourceIndex ? col.filter(c => c.id !== card.id) : col
              );
              awardCardXP(card.id);
              set({ tableau: newTableau, moves: currentState.moves + 1 });
            } else if (sourceType === 'waste') {
              const newWaste = currentState.waste.filter(c => c.id !== card.id);
              awardCardXP(card.id);
              set({ waste: newWaste, moves: currentState.moves + 1 });
            } else if (sourceType === 'stock') {
              const newStock = currentState.stock.filter(c => c.id !== card.id);
              awardCardXP(card.id);
              set({ stock: newStock, moves: currentState.moves + 1 });
            }
            
            // Trigger collection item drop
            const dropX = endRect.left + endRect.width / 2;
            const dropY = endRect.top + endRect.height / 2;
            import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
              triggerCardToFoundation(dropX, dropY);
            });
            
            // Add points silently
            import('../solitaire/scoring').then(({ CARD_POINTS }) => {
              const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
              get().addPointsToProgress(points);
            });
            
            // Check if all done
            if (completedCards >= totalCards) {
              const finalState = get();
              const totalInFoundations = Object.values(finalState.foundations).reduce((sum, f) => sum + f.length, 0);
              
              if (totalInFoundations === 52 && !finalState.isWon) {
                awardWinXP();
                const gameTime = finalState.startTime ? 
                  Math.floor((Date.now() - finalState.startTime.getTime()) / 1000) : 0;
                let totalScore = 0;
                Object.values(finalState.foundations).forEach(foundation => {
                  foundation.forEach(c => { totalScore += calculateCardPoints(c); });
                });
                GameIntegration.getInstance().onGameEnd(totalScore, gameTime, finalState.totalGifts);
                set({ isWon: true, isAutoCollecting: false });
              } else {
                // Not won yet - check if we should continue auto-collecting
                set({ isAutoCollecting: false });
                // Re-trigger auto-collect after a short delay to pick up any remaining cards
                setTimeout(() => {
                  const checkState = get();
                  if (!checkState.isWon && !checkState.isAutoCollecting) {
                    get().triggerAutoCollect();
                  }
                }, 100);
              }
            }
          });
        });
        
        // Flying suit icon
        const centerX = startRect.left + startRect.width / 2;
        const centerY = startRect.top + startRect.height / 2;
        import('../flyingSuitIconManager').then(({ addFlyingSuitIcon }) => {
          addFlyingSuitIcon(card.suit, centerX, centerY);
        });
      }, index * STAGGER_DELAY);
    });
    
    // Safety timeout - ensure auto-collect ends and retries if needed
    const maxTime = cardsToMove.length * STAGGER_DELAY + FLIGHT_DURATION + 500;
    setTimeout(() => {
      const currentState = get();
      if (currentState.isAutoCollecting) {
        set({ isAutoCollecting: false });
        // Try to continue if not won
        if (!currentState.isWon) {
          setTimeout(() => {
            const checkState = get();
            if (!checkState.isWon && !checkState.isAutoCollecting) {
              get().triggerAutoCollect();
            }
          }, 100);
        }
      }
    }, maxTime);
  },
  
  // Collect all available cards to foundation (triggered by double-click)
  // Unlike triggerAutoCollect, this works even if not all cards are revealed
  // Uses launchFlyingCard for parallel animations (not animatingCard which is single)
  collectAllAvailable: () => {
    const state = get();
    
    if (state.isAutoCollecting || state.isWon) return;
    
    const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Build simulation to get correct order of moves (respecting dependencies)
    let simTableau = state.tableau.map(col => [...col]);
    let simWaste = [...state.waste];
    let simFoundations: Record<Suit, Card[]> = {
      hearts: [...(state.foundations.hearts || [])],
      diamonds: [...(state.foundations.diamonds || [])],
      clubs: [...(state.foundations.clubs || [])],
      spades: [...(state.foundations.spades || [])]
    };
    
    // Helper to check if card can move in simulation
    const canMoveInSim = (card: Card): boolean => {
      const foundation = simFoundations[card.suit];
      if (card.rank === 'A' && foundation.length === 0) return true;
      if (foundation.length > 0) {
        const topCard = foundation[foundation.length - 1];
        return rankOrder.indexOf(card.rank) === rankOrder.indexOf(topCard.rank) + 1;
      }
      return false;
    };
    
    // Find all cards in correct order
    const cardsToMove: { card: Card; source: 'tableau' | 'waste'; columnIndex?: number }[] = [];
    
    let safetyCounter = 0;
    while (safetyCounter < 30) {
      safetyCounter++;
      let foundCard = false;
      
      // Check tableau
      for (let i = 0; i < simTableau.length; i++) {
        const column = simTableau[i];
        if (column.length > 0) {
          const topCard = column[column.length - 1];
          if (topCard.faceUp && canMoveInSim(topCard)) {
            cardsToMove.push({ card: topCard, source: 'tableau', columnIndex: i });
            // Remove card and flip the one underneath in simulation
            const newColumn = column.slice(0, -1);
            if (newColumn.length > 0 && !newColumn[newColumn.length - 1].faceUp) {
              newColumn[newColumn.length - 1] = { ...newColumn[newColumn.length - 1], faceUp: true };
            }
            simTableau[i] = newColumn;
            simFoundations[topCard.suit] = [...simFoundations[topCard.suit], topCard];
            foundCard = true;
            break;
          }
        }
      }
      
      if (!foundCard && simWaste.length > 0) {
        const topWaste = simWaste[simWaste.length - 1];
        if (canMoveInSim(topWaste)) {
          cardsToMove.push({ card: topWaste, source: 'waste' });
          simWaste = simWaste.slice(0, -1);
          simFoundations[topWaste.suit] = [...simFoundations[topWaste.suit], topWaste];
          foundCard = true;
        }
      }
      
      if (!foundCard) break;
    }
    
    if (cardsToMove.length === 0) return;
    
    // Animation settings
    const FLIGHT_DURATION = 150;
    const STAGGER_DELAY = 80;
    
    // Track cards that are "in flight" so we know order is maintained
    const cardsInFlight = new Set<string>();
    
    // Launch parallel animations using launchFlyingCard
    // Trust the simulation order - don't re-check canAdd (previous cards may still be flying)
    cardsToMove.forEach((moveInfo, index) => {
      setTimeout(() => {
        const { card, source, columnIndex } = moveInfo;
        
        // Mark this card as in flight
        cardsInFlight.add(card.id);
        
        // Get card element
        const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
        if (!cardElement) return;
        
        const startRect = cardElement.getBoundingClientRect();
        
        // Remove card from source IMMEDIATELY to prevent visual duplication
        const stateBeforeRemove = get();
        if (source === 'tableau' && columnIndex !== undefined) {
          const newTableau = stateBeforeRemove.tableau.map((col, i) => {
            if (i === columnIndex) {
              const filtered = col.filter(c => c.id !== card.id);
              // Flip card underneath
              if (filtered.length > 0 && !filtered[filtered.length - 1].faceUp) {
                filtered[filtered.length - 1] = { ...filtered[filtered.length - 1], faceUp: true };
              }
              return filtered;
            }
            return col;
          });
          set({ tableau: newTableau });
        } else if (source === 'waste') {
          const newWaste = stateBeforeRemove.waste.filter(c => c.id !== card.id);
          set({ waste: newWaste });
        }
        
        // Reserve foundation slot if needed
        const currentOrder = get().foundationSlotOrder;
        if (!currentOrder.includes(card.suit)) {
          const freshOrder = get().foundationSlotOrder;
          if (!freshOrder.includes(card.suit)) {
            set({ foundationSlotOrder: [...freshOrder, card.suit] });
          }
        }
        
        // Wait for DOM to update with new slot
        setTimeout(() => {
          const foundationElement = document.querySelector(`[data-foundation-pile="${card.suit}"]`) as HTMLElement;
          if (!foundationElement) return;
          
          // Trigger flying suit icon and score
          const centerX = startRect.left + startRect.width / 2;
          const centerY = startRect.top + startRect.height / 2;
          import('../flyingSuitIconManager').then(({ addFlyingSuitIcon }) => {
            addFlyingSuitIcon(card.suit, centerX, centerY);
          });
          import('../solitaire/scoring').then(({ CARD_POINTS }) => {
            const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
            get().addFloatingScore(points, startRect.left - 20, startRect.top + startRect.height / 2, card.rank, card.isPremium);
          });
          
          const endRect = foundationElement.getBoundingClientRect();
          
          // Launch flying card animation (parallel capable)
          import('../../components/solitaire/FlyingCard').then(({ launchFlyingCard }) => {
            launchFlyingCard({ ...card, faceUp: true }, startRect, endRect, FLIGHT_DURATION, () => {
              // Add card to foundation AFTER animation completes
              const stateForFoundation = get();
              const newFoundations = { ...stateForFoundation.foundations };
              newFoundations[card.suit] = [...(newFoundations[card.suit] || []), card];
              
              awardCardXP(card.id);
              set({ 
                foundations: newFoundations,
                moves: stateForFoundation.moves + 1 
              });
              
              // Trigger collection item drop
              import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
                const fRect = foundationElement.getBoundingClientRect();
                triggerCardToFoundation(fRect.left + fRect.width / 2, fRect.top + fRect.height / 2);
              });
              
              // Check win
              const winState = get();
              const totalInFoundations = Object.values(winState.foundations).reduce((sum, f) => sum + f.length, 0);
              if (totalInFoundations === 52 && !winState.isWon) {
                awardWinXP();
                set({ isWon: true });
              }
            });
          });
        }, 10);
      }, index * STAGGER_DELAY);
    });
  }
}));
