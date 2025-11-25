import { create } from 'zustand';
import { GameState, DragState, Card, Suit } from '../solitaire/types';
import { initializeGame, drawFromStock, moveCards, getMovableCards } from '../solitaire/gameLogic';
import { canPlaceOnTableau } from '../solitaire/cardUtils';
import { clearAllDropTargetHighlights } from '../solitaire/styleManager';
import { calculateCardPoints, calculateCardPointsRaw, resetScoredCards } from '../solitaire/scoring';
import { addPointsToProgress } from '../solitaire/progressManager';
import { addFloatingScore } from '../solitaire/floatingScoreManager';
import GameIntegration from '../gameIntegration';
import { generateSolvableGame, generateUnsolvableGame } from '../solitaire/solvableGenerator';

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
  triggerAutoCollect: () => void;
  
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
  
  setCollisionHighlight: (enabled) => {
    set({ collisionHighlightEnabled: enabled });
  },
  
  setStockAnimating: (animating) => {
    set({ isStockAnimating: animating });
  },
  
  newGame: (mode: 'random' | 'solvable' | 'unsolvable' = 'random') => {
    const newGameState = mode === 'solvable' 
      ? generateSolvableGame() 
      : mode === 'unsolvable'
      ? generateUnsolvableGame()
      : initializeGame();
    resetScoredCards(); // Reset scored cards for new game
    clearAutoCollectingCards(); // Reset auto-collecting cards tracker
    set({
      ...newGameState,
      isDragging: false,
      draggedCards: [],
      sourceType: 'tableau',
      sourceIndex: undefined,
      sourceFoundation: undefined,
      animatingCard: null,
      foundationSlotOrder: [] // Reset slot order for new game
    });
    
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
      console.log('🎬 Setting animation near complete flag');
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
    
    console.log('🎴 Draw card: triggered, calling auto-collect');
    
    // Trigger auto-collect after drawing from stock
    setTimeout(() => {
      get().triggerAutoCollect();
    }, 10); // Very short delay - almost immediate
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
      console.log('🔙 endDrag: Animating return to source');
      
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
      
      // Check if game is won and notify lobby
      if (newGameState.isWon && !get().isWon) {
        const gameTime = newGameState.startTime ? 
          Math.floor((Date.now() - newGameState.startTime.getTime()) / 1000) : 0;
        
        // Calculate total score based on cards in foundations
        let totalScore = 0;
        Object.values(newGameState.foundations).forEach(foundation => {
          foundation.forEach(card => {
            totalScore += calculateCardPoints(card);
          });
        });
        
        
        console.log('🎉 Game won! Notifying lobby with score:', totalScore);
        GameIntegration.getInstance().onGameEnd(totalScore, gameTime, newGameState.totalGifts);
      }
      
      // Trigger auto-collect ONLY if not moving from foundation back to tableau
      // (player is intentionally taking card back, don't interfere)
      const isMovingFromFoundation = state.sourceType === 'foundation';
      if (!isMovingFromFoundation) {
        setTimeout(() => {
          get().triggerAutoCollect();
        }, 100); // Small delay to let state update
      } else {
        console.log('🚫 Auto-collect: Skipping because player moved card from foundation');
      }
    } else {
      console.log('❌ Move failed, invalid move attempted - animating return');
      
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
          console.log('🔍 Return animation: Looking for card', firstDraggedCard.id, 'found:', !!sourceElement);
        } else if (state.sourceType === 'foundation' && state.sourceFoundation) {
          sourceElement = document.querySelector(`[data-foundation-pile="${state.sourceFoundation}"]`) as HTMLElement;
        }
        
        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          
          console.log('📐 Return animation coordinates:', {
            start: { x: previewRect.left, y: previewRect.top },
            end: { x: sourceRect.left, y: sourceRect.top }
          });
          
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
    
    console.log(`🔍 canAutoMoveToFoundation: checking ${card.suit}-${card.rank}, foundation ${suit} has ${foundationCards.length} cards`);
    
    if (foundationCards.length === 0 && card.rank === 'A') {
      console.log(`✅ canAutoMoveToFoundation: Ace can be moved to empty foundation ${suit}`);
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
      
      console.log(`🔍 Comparing: ${card.suit}-${card.rank} (${cardValue}) vs top ${topCard.suit}-${topCard.rank} (${topValue})`);
                      
      if (cardValue === topValue + 1) {
        console.log(`✅ canAutoMoveToFoundation: ${card.suit}-${card.rank} can go on ${topCard.suit}-${topCard.rank}`);
        return suit;
      }
    }
    
    console.log(`❌ canAutoMoveToFoundation: ${card.suit}-${card.rank} cannot move to foundation`);
    return null;
  },
  
  autoMoveToFoundation: (card, suit, startElement, endElement, speed = 75) => {
    // Check if card is already being auto-collected to prevent duplicates
    if (autoCollectingCards.has(card.id)) {
      return; // Skip - already in progress
    }
    autoCollectingCards.add(card.id);
    
    // Immediately flip the card underneath in tableau (don't wait for animation to complete)
    const state = get();
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
    
    // Trigger flying suit icon effect and floating score immediately
    if (startElement) {
      const startRect = startElement.getBoundingClientRect();
      const centerX = startRect.left + startRect.width / 2;
      const centerY = startRect.top + startRect.height / 2;
      
      // Import and call flying icon effect
      import('../flyingSuitIconManager').then(({ addFlyingSuitIcon }) => {
        addFlyingSuitIcon(card.suit, centerX, centerY);
      });
      
      // Show floating score immediately at start of animation
      const scoreX = startRect.left - 20;
      const scoreY = startRect.top + startRect.height / 2;
      import('../solitaire/scoring').then(({ CARD_POINTS }) => {
        const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
        get().addFloatingScore(points, scoreX, scoreY, card.rank, card.isPremium);
      });
    }
    
    // Reserve slot for this suit if not already reserved
    const currentOrder = get().foundationSlotOrder;
    if (!currentOrder.includes(suit)) {
      const newOrder = [...currentOrder, suit];
      console.log(`🎯 Reserving slot ${currentOrder.length} for ${suit}`);
      set({ foundationSlotOrder: newOrder });
      
      // Wait for React to update DOM with new order before getting element position
      setTimeout(() => {
        // Re-fetch the end element after DOM update
        const updatedEndElement = document.querySelector(`[data-foundation-pile="${suit}"]`) as HTMLElement;
        
        if (!updatedEndElement) {
          console.warn(`⚠️ Could not find foundation pile for suit ${suit} after reorder`);
          autoCollectingCards.delete(card.id); // Clean up on failure
          return;
        }
        
        // Store start position for floating score
        let cardStartPosition = null;
        if (startElement) {
          const startRect = startElement.getBoundingClientRect();
          cardStartPosition = { 
            x: startRect.left - 20,
            y: startRect.top + startRect.height / 2
          };
        }
        
        // Trigger animation with updated coordinates
        if (startElement && updatedEndElement) {
          const startRect = startElement.getBoundingClientRect();
          const endRect = updatedEndElement.getBoundingClientRect();
          
          set({
            animatingCard: {
              card,
              startPosition: { x: startRect.left, y: startRect.top },
              endPosition: { x: endRect.left, y: endRect.top },
              targetSuit: suit,
              cardStartPosition,
              speed
            }
          });
        }
      }, 0);
      return;
    }
    
    // Suit already has a slot, proceed normally
    // Store start position for floating score
    let cardStartPosition = null;
    if (startElement) {
      const startRect = startElement.getBoundingClientRect();
      cardStartPosition = { 
        x: startRect.left - 20,
        y: startRect.top + startRect.height / 2
      };
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
          cardStartPosition,
          speed
        }
      });
    } else {
      // No animation, move immediately
      get().completeCardAnimation(card, suit, cardStartPosition);
    }
  },
  
  findTableauPlacementForCard: (card) => {
    const state = get();
    
    console.log('🔍 findTableauPlacementForCard: Searching for placement', {
      card: `${card.suit}-${card.rank}`,
      tableauColumns: state.tableau.map((col, i) => ({
        index: i,
        length: col.length,
        topCard: col.length > 0 ? `${col[col.length - 1].suit}-${col[col.length - 1].rank}` : 'empty',
        topCardFaceUp: col.length > 0 ? col[col.length - 1].faceUp : false
      }))
    });
    
    // Try each tableau column to find a valid placement
    for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
      const column = state.tableau[colIndex];
      
      // If column is empty, only King can be placed
      if (column.length === 0) {
        if (card.rank === 'K') {
          console.log(`✅ findTableauPlacementForCard: King can go to empty column ${colIndex}`);
          return colIndex;
        }
        continue;
      }
      
      // Check if card can be placed on the last card in the column
      const lastCard = column[column.length - 1];
      const canPlace = canPlaceOnTableau(lastCard, card); // lastCard is bottom (target), card is top (being placed)
      console.log(`🔍 Column ${colIndex}: Can place ${card.suit}-${card.rank} (${card.color}) on ${lastCard.suit}-${lastCard.rank} (${lastCard.color})? ${canPlace} (faceUp: ${lastCard.faceUp})`);
      
      if (lastCard.faceUp && canPlace) {
        console.log(`✅ findTableauPlacementForCard: Card can go to column ${colIndex} on ${lastCard.suit}-${lastCard.rank}`);
        return colIndex;
      }
    }
    
    console.log('❌ findTableauPlacementForCard: No valid placement found');
    return null; // No valid placement found
  },
  
  autoMoveToTableau: (card, targetColumnIndex, startElement) => {
    console.log(`🚀 autoMoveToTableau: moving ${card.suit}-${card.rank} to tableau column ${targetColumnIndex}`);
    
    const state = get();
    const targetColumn = state.tableau[targetColumnIndex];
    
    // Find target element - if column has cards, find the last card, otherwise use the column container
    let endElement: HTMLElement | null = null;
    
    if (targetColumn.length > 0) {
      // Find the last card in the target column
      const lastCard = targetColumn[targetColumn.length - 1];
      endElement = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
      console.log('🎯 autoMoveToTableau: Found last card in column', lastCard.id);
    } else {
      // Column is empty, use the column container
      endElement = document.querySelector(`[data-tableau-column="${targetColumnIndex}"]`) as HTMLElement;
      console.log('🎯 autoMoveToTableau: Column is empty, using container');
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
      
      console.log('📐 autoMoveToTableau: Animation coordinates', {
        start: { x: startRect.left, y: startRect.top },
        end: { x: endRect.left, y: endRect.top + verticalOffset },
        baseOffset,
        scale,
        verticalOffset
      });
      
      // For animation to tableau, we don't need cardStartPosition (no points scored)
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
    } else {
      console.log('⚠️ autoMoveToTableau: Missing elements, moving immediately');
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
    console.log(`🚀 autoMoveStackToTableau: moving ${cards.length} cards from column ${sourceColumnIndex} to column ${targetColumnIndex}`);
    
    const state = get();
    const targetColumn = state.tableau[targetColumnIndex];
    
    // Find target element - if column has cards, find the last card, otherwise use the column container
    let endElement: HTMLElement | null = null;
    
    if (targetColumn.length > 0) {
      // Find the last card in the target column
      const lastCard = targetColumn[targetColumn.length - 1];
      endElement = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
      console.log('🎯 autoMoveStackToTableau: Found last card in column', lastCard.id);
    } else {
      // Column is empty, use the column container
      endElement = document.querySelector(`[data-tableau-column="${targetColumnIndex}"]`) as HTMLElement;
      console.log('🎯 autoMoveStackToTableau: Column is empty, using container');
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
      
      console.log('📐 autoMoveStackToTableau: Animation coordinates', {
        start: { x: startRect.left, y: startRect.top },
        end: { x: endRect.left, y: endRect.top + verticalOffset },
        baseOffset,
        scale,
        verticalOffset
      });
      
      // Animate the bottom card of the stack
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
    } else {
      console.log('⚠️ autoMoveStackToTableau: Missing elements, moving immediately');
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
      console.log('🔙 Return animation complete, clearing animatingCard state immediately');
      set({ animatingCard: null });
      return;
    }
    
    // Check if this is a tableau move
    if (animating?.isTableauMove && animating.targetTableauColumn !== undefined) {
      console.log(`🎯 Tableau move animation complete, moving to column ${animating.targetTableauColumn}`);
      
      // Check if this is a stack move
      if (animating.isStackMove && animating.stackCards && animating.sourceTableauColumn !== undefined) {
        console.log(`🎯 Stack move: ${animating.stackCards.length} cards from column ${animating.sourceTableauColumn}`);
        
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
      undefined, // Floating score already shown at animation start
      null
    );
    
    if (newGameState) {
      // Remove card from auto-collecting tracking
      autoCollectingCards.delete(card.id);
      
      set({ ...newGameState, animatingCard: null });
      
      // Check if game is won and notify lobby
      if (newGameState.isWon && !get().isWon) {
        const gameTime = newGameState.startTime ? 
          Math.floor((Date.now() - newGameState.startTime.getTime()) / 1000) : 0;
        
        // Calculate total score based on cards in foundations
        let totalScore = 0;
        Object.values(newGameState.foundations).forEach(foundation => {
          foundation.forEach(card => {
            totalScore += calculateCardPoints(card);
          });
        });
        
        
        console.log('🎉 Game won! Notifying lobby with score:', totalScore);
        GameIntegration.getInstance().onGameEnd(totalScore, gameTime, newGameState.totalGifts);
      }
      
      // Trigger auto-collect after animation completes
      setTimeout(() => {
        get().triggerAutoCollect();
      }, 10); // Very short delay - almost immediate
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
    
    console.log('📊 Current results calculated:', {
      score: currentScore,
      giftsEarned: state.totalGifts
    });
    
    return {
      score: currentScore,
      giftsEarned: state.totalGifts
    };
  },
  
  triggerAutoCollect: () => {
    const state = get();
    
    console.log('🤖 Auto-collect: Starting check...', {
      animatingCard: state.animatingCard ? `${state.animatingCard.card.suit}-${state.animatingCard.card.rank}` : 'none',
      tableauCols: state.tableau.filter(c => c.length > 0).length,
      wasteCards: state.waste.length,
      stockCards: state.stock.length
    });
    
    // Check if ALL remaining cards can be moved to foundations
    // This includes: tableau (with proper uncovering), waste pile, and stock
    const canFullyAutoCollect = () => {
      // Create a virtual state to simulate moves (deep clone)
      const virtualTableau = state.tableau.map(col => col.map(c => ({...c})));
      const virtualStock = [...state.stock.map(c => ({...c}))];
      const virtualWaste = [...state.waste.map(c => ({...c}))];
      const virtualFoundations = {
        hearts: [...state.foundations.hearts.map(c => ({...c}))],
        diamonds: [...state.foundations.diamonds.map(c => ({...c}))],
        clubs: [...state.foundations.clubs.map(c => ({...c}))],
        spades: [...state.foundations.spades.map(c => ({...c}))]
      };
      
      const rankOrder: { [key in Rank]: number } = {
        'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
      };
      
      // Helper to check if card can go to foundation in virtual state
      const canMoveToVirtualFoundation = (card: Card): Suit | null => {
        const foundation = virtualFoundations[card.suit];
        
        if (card.rank === 'A') {
          return foundation.length === 0 ? card.suit : null;
        }
        
        if (foundation.length === 0) return null;
        
        const topCard = foundation[foundation.length - 1];
        
        if (rankOrder[card.rank] === rankOrder[topCard.rank] + 1) {
          return card.suit;
        }
        
        return null;
      };
      
      let movedCount = 0;
      let maxIterations = 500; // Prevent infinite loops
      let iteration = 0;
      let stockCycles = 0;
      const maxStockCycles = 3; // Allow cycling through stock 3 times
      
      while (iteration < maxIterations) {
        iteration++;
        let foundMove = false;
        
        // 1. Try to move from tableau
        for (let col = 0; col < virtualTableau.length; col++) {
          const column = virtualTableau[col];
          if (column.length === 0) continue;
          
          const topCard = column[column.length - 1];
          if (!topCard.faceUp) continue;
          
          const targetSuit = canMoveToVirtualFoundation(topCard);
          if (targetSuit) {
            // Move card to foundation
            virtualFoundations[targetSuit].push(topCard);
            column.pop();
            
            // Uncover next card
            if (column.length > 0) {
              column[column.length - 1].faceUp = true;
            }
            
            movedCount++;
            foundMove = true;
            break;
          }
        }
        
        if (foundMove) continue;
        
        // 2. Try to move from waste
        if (virtualWaste.length > 0) {
          const wasteTop = virtualWaste[virtualWaste.length - 1];
          const targetSuit = canMoveToVirtualFoundation(wasteTop);
          
          if (targetSuit) {
            virtualFoundations[targetSuit].push(wasteTop);
            virtualWaste.pop();
            movedCount++;
            foundMove = true;
            continue;
          }
        }
        
        // 3. Draw from stock
        if (virtualStock.length > 0) {
          const card = virtualStock.pop()!;
          card.faceUp = true;
          virtualWaste.push(card);
          foundMove = true;
          continue;
        }
        
        // 4. Recycle waste back to stock (if waste is not empty)
        if (virtualWaste.length > 0 && virtualStock.length === 0) {
          stockCycles++;
          
          if (stockCycles > maxStockCycles) {
            // We've cycled too many times, game is not fully solvable
            console.log(`🤖 Auto-collect: Failed after ${stockCycles} stock cycles`);
            break;
          }
          
          // Recycle waste to stock
          while (virtualWaste.length > 0) {
            const card = virtualWaste.pop()!;
            card.faceUp = false;
            virtualStock.unshift(card);
          }
          foundMove = true;
          continue;
        }
        
        // No moves found
        if (!foundMove) {
          // No more moves possible - check if we solved it
          const remainingCards = virtualTableau.flat().length + virtualStock.length + virtualWaste.length;
          console.log(`🤖 Auto-collect: Stopped. ${remainingCards} cards remaining in play, ${movedCount} moved to foundations`);
          
          // Success if all 52 cards are in foundations
          return remainingCards === 0;
        }
      }
      
      // Check final result
      const remainingCards = virtualTableau.flat().length + virtualStock.length + virtualWaste.length;
      console.log(`🤖 Auto-collect: Max iterations reached. ${remainingCards} cards remaining, ${movedCount} moved`);
      return remainingCards === 0;
    };
    
    // Check if we can fully auto-collect
    if (!canFullyAutoCollect()) {
      console.log('🤖 Auto-collect: Not all cards can be auto-collected yet, waiting...');
      return;
    }
    
    console.log('🤖 Auto-collect: Full auto-collect possible! Starting chain...');
    
    // Find all cards that can be auto-moved RIGHT NOW
    interface AutoMoveCandidate {
      card: Card;
      suit: Suit;
      sourceType: 'tableau' | 'waste' | 'stock';
      sourceIndex?: number; // For tableau
    }
    
    const findCandidates = (): AutoMoveCandidate[] => {
      const currentState = get();
      const candidates: AutoMoveCandidate[] = [];
      
      console.log(`🔍 Finding candidates: tableau=${currentState.tableau.filter(c => c.length > 0).length} cols, waste=${currentState.waste.length}, stock=${currentState.stock.length}`);
      
      // 1. Check tableau columns
      for (let i = 0; i < currentState.tableau.length; i++) {
        const column = currentState.tableau[i];
        if (column.length > 0) {
          const topCard = column[column.length - 1];
          if (topCard.faceUp) {
            const targetSuit = get().canAutoMoveToFoundation(topCard);
            if (targetSuit) {
              console.log(`✅ Found move: ${topCard.suit}-${topCard.rank} from tableau ${i} to foundation`);
              candidates.push({
                card: topCard,
                suit: targetSuit,
                sourceType: 'tableau',
                sourceIndex: i
              });
            }
          }
        }
      }
      
      // 2. Check waste pile
      if (currentState.waste.length > 0) {
        const wasteTop = currentState.waste[currentState.waste.length - 1];
        const targetSuit = get().canAutoMoveToFoundation(wasteTop);
        if (targetSuit) {
          console.log(`✅ Found move: ${wasteTop.suit}-${wasteTop.rank} from waste to foundation`);
          candidates.push({
            card: wasteTop,
            suit: targetSuit,
            sourceType: 'waste'
          });
        } else {
          console.log(`❌ Waste card ${wasteTop.suit}-${wasteTop.rank} cannot move to foundation yet`);
        }
      }
      
      // 3. If no moves available, but stock OR waste exists, we need to draw/recycle
      if (candidates.length === 0) {
        if (currentState.stock.length > 0) {
          // Stock has cards - draw one
          console.log(`🎴 No immediate moves, drawing from stock (${currentState.stock.length} cards)`);
          candidates.push({
            card: currentState.stock[currentState.stock.length - 1],
            suit: 'hearts', // Placeholder
            sourceType: 'stock'
          });
        } else if (currentState.waste.length > 0) {
          // Stock empty but waste has cards - recycle waste to stock
          console.log(`♻️ No immediate moves, recycling waste (${currentState.waste.length} cards) to stock`);
          candidates.push({
            card: currentState.waste[0], // Placeholder
            suit: 'hearts', // Placeholder
            sourceType: 'stock' // Will trigger drawCard which handles recycling
          });
        } else {
          console.log(`❌ No moves available and stock/waste empty - stopping`);
        }
      }
      
      return candidates;
    };
    
    const candidates = findCandidates();
    
    if (candidates.length === 0) {
      console.log('🤖 Auto-collect: No more moves possible, auto-collect complete!');
      return;
    }
    
    console.log(`🤖 Auto-collect: Found ${candidates.length} card(s) to process`);
    
    // Special case: if first candidate is stock draw, handle it separately
    if (candidates[0].sourceType === 'stock') {
      console.log(`🤖 Auto-collect: Drawing card from stock`);
      get().drawCard();
      // drawCard will trigger auto-collect automatically after drawing
      return;
    }
    
    // Launch ALL available cards immediately in parallel - NO batching!
    const moveCandidates = candidates.filter(c => c.sourceType !== 'stock');
    
    console.log(`🚀 Auto-collect: Launching ALL ${moveCandidates.length} cards in parallel`);
    
    moveCandidates.forEach((candidate, index) => {
      // Ultra-fast animation speed with aggressive exponential speedup
      const baseSpeed = 25; // Start at 25ms
      const speedupFactor = 0.85; // Each card 15% faster
      const minSpeed = 3; // Minimum 3ms
      const animationSpeed = Math.max(minSpeed, baseSpeed * Math.pow(speedupFactor, index));
      
      // Launch immediately, no setTimeout
      console.log(`🤖 Auto-collect: Moving ${candidate.card.suit}-${candidate.card.rank} from ${candidate.sourceType} (${Math.round(animationSpeed)}ms)`);
      
      // Find DOM elements for animation
      let startElement: HTMLElement | undefined;
      let endElement: HTMLElement | undefined;
      
      if (candidate.sourceType === 'tableau') {
        startElement = document.querySelector(
          `[data-tableau-column="${candidate.sourceIndex}"] [data-card-is-top="true"]`
        ) as HTMLElement;
      } else if (candidate.sourceType === 'waste') {
        startElement = document.querySelector('[data-waste-pile] [data-card-is-top="true"]') as HTMLElement;
      }
      
      endElement = document.querySelector(
        `[data-foundation-pile="${candidate.suit}"]`
      ) as HTMLElement;
      
      // Auto-move the card
      get().autoMoveToFoundation(candidate.card, candidate.suit, startElement, endElement, animationSpeed);
    });
    
    // After launching all cards, schedule next iteration very quickly
    setTimeout(() => {
      get().triggerAutoCollect();
    }, 50); // Very short delay - just enough to let first animation start
  }
}));
