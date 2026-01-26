import { create } from 'zustand';
import { GameState, DragState, Card, Suit } from '../solitaire/types';
import { initializeGame, drawFromStock, moveCards, getMovableCards } from '../solitaire/gameLogic';
import { canPlaceOnTableau } from '../solitaire/cardUtils';
import { clearAllDropTargetHighlights } from '../solitaire/styleManager';
import { calculateCardPoints, calculateCardPointsRaw, resetScoredCards } from '../solitaire/scoring';
import { addFloatingScore } from '../solitaire/floatingScoreManager';
import GameIntegration from '../gameIntegration';
import { generateSolvableGame, generateUnsolvableGame, markFirstWin, ensureSolvability } from '../solitaire/solvableGenerator';
import { awardWinXP, awardCardXP, resetXPEarnedCards } from '../solitaire/experienceManager';
import { resetCardsMovedForCollection } from '../../components/solitaire/FlyingCollectionIcon';
import { collectKeyFromCard } from '../liveops/keyManager';
import { getCardOffset, isMobileDevice } from '../solitaire/cardConstants';

// Track cards currently being auto-collected to prevent duplicates
const autoCollectingCards = new Set<string>();

function clearAutoCollectingCards() {
  autoCollectingCards.clear();
}

// Move history for undo functionality (store up to 50 moves)
interface HistoryState {
  tableau: Card[][];
  foundations: { hearts: Card[]; diamonds: Card[]; clubs: Card[]; spades: Card[] };
  stock: Card[];
  waste: Card[];
  foundationSlotOrder: Suit[];
}
let moveHistory: HistoryState[] = [];
const MAX_HISTORY = 50;

function saveStateToHistory(state: HistoryState) {
  // Deep clone the state
  const clonedState: HistoryState = {
    tableau: state.tableau.map(col => col.map(card => ({ ...card }))),
    foundations: {
      hearts: state.foundations.hearts.map(card => ({ ...card })),
      diamonds: state.foundations.diamonds.map(card => ({ ...card })),
      clubs: state.foundations.clubs.map(card => ({ ...card })),
      spades: state.foundations.spades.map(card => ({ ...card })),
    },
    stock: state.stock.map(card => ({ ...card })),
    waste: state.waste.map(card => ({ ...card })),
    foundationSlotOrder: [...state.foundationSlotOrder],
  };
  moveHistory.push(clonedState);
  if (moveHistory.length > MAX_HISTORY) {
    moveHistory.shift();
  }
}

function clearMoveHistory() {
  moveHistory = [];
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
  isUndoAnimation?: boolean; // Flag to indicate this is an undo animation
  undoPreviousState?: HistoryState; // State to apply after undo animation completes
}

// Flag to track if undo is in progress (prevents rapid clicking)
let isUndoInProgress = false;

// Timestamp of last undo completion (to disable transitions briefly after undo)
let lastUndoCompletedAt = 0;

// Check if undo just completed (within the last 100ms)
export function wasUndoJustCompleted(): boolean {
  return Date.now() - lastUndoCompletedAt < 100;
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
  moveFoundationToTableau: (card: Card, suit: Suit, startElement?: HTMLElement) => boolean; // Move card from foundation to tableau
  
  // Auto-collect functionality
  isAutoCollecting: boolean;
  triggerAutoCollect: () => void;
  collectAllAvailable: () => void; // Collect all available cards to foundation (double-click)
  stopAutoCollect: () => void;
  autoDrawUntilFoundOrCycled: () => void; // Auto-draw from stock until a card can be moved or full cycle
  
  // No moves detection
  hasNoMoves: boolean;
  checkForAvailableMoves: () => boolean;
  clearNoMoves: () => void;
  
  // Undo functionality
  canUndo: boolean;
  undo: () => void;
  
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

// Initialize game state once for reuse
const initialGameState = initializeGame();

// Reset all tracking on store initialization (fresh start)
resetScoredCards();
resetXPEarnedCards();

export const useSolitaire = create<SolitaireStore>((set, get) => ({
  // Initial game state
  ...initialGameState,
  
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
  
  // Undo state
  canUndo: false,
  
  // Hint state
  hint: null,
  
  // Dealing animation state - populate with initial cards
  isDealing: true,
  dealingCardIds: new Set(initialGameState.tableau.flat().map(c => c.id)),
  
  setCollisionHighlight: (enabled) => {
    set({ collisionHighlightEnabled: enabled });
  },
  
  setStockAnimating: (animating) => {
    set({ isStockAnimating: animating });
  },
  
  newGame: (mode: 'random' | 'solvable' | 'unsolvable' = 'solvable') => {
    // IMPORTANT: Reset all tracking sets BEFORE generating new game
    // This ensures cards in new game can earn points/XP
    resetScoredCards(); // Reset scored cards for new game
    resetXPEarnedCards(); // Reset XP tracking for new game
    clearAutoCollectingCards(); // Reset auto-collecting cards tracker
    resetCardsMovedForCollection(); // Reset cards counter for collection drops
    clearMoveHistory(); // Clear undo history for new game
    
    console.log('🎮 Starting new game, all tracking reset');
    
    const newGameState = mode === 'solvable' 
      ? generateSolvableGame() 
      : mode === 'unsolvable'
      ? generateUnsolvableGame()
      : initializeGame();
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
      canUndo: false, // Reset undo state
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
    
    // Save state before drawing for undo
    saveStateToHistory({
      tableau: currentState.tableau,
      foundations: currentState.foundations,
      stock: currentState.stock,
      waste: currentState.waste,
      foundationSlotOrder: currentState.foundationSlotOrder,
    });
    
    const newState = drawFromStock(currentState);
    set({ ...newState, canUndo: true });
    
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
    
    // Save state before the move for undo
    saveStateToHistory({
      tableau: state.tableau,
      foundations: state.foundations,
      stock: state.stock,
      waste: state.waste,
      foundationSlotOrder: state.foundationSlotOrder,
    });
    set({ canUndo: true });
    
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
          const card = state.draggedCards[0];
          // Use isCardEventScored (separate from level-up scoring) to prevent double event points
          import('../solitaire/scoring').then(({ CARD_POINTS, isCardEventScored, markCardEventScored }) => {
            if (!isCardEventScored(card.id)) {
              markCardEventScored(card.id);
              const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
              import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
                triggerCardToFoundation(dropX, dropY, points);
              });
            }
          });
        }
      }
      
      // Ensure game remains solvable after card reveal
      const solvableState = ensureSolvability(newGameState);
      
      set({
        ...solvableState,
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
        // Award XP for winning and mark first win
        awardWinXP();
        markFirstWin();
        
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
        }, 50); // Small delay to let state update
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
    
    // Save state for undo before the move
    const currentState = get();
    saveStateToHistory({
      tableau: currentState.tableau,
      foundations: currentState.foundations,
      stock: currentState.stock,
      waste: currentState.waste,
      foundationSlotOrder: currentState.foundationSlotOrder,
    });
    set({ canUndo: true });
    
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
      import('../solitaire/scoring').then(({ calculateCardPoints, CARD_POINTS, isCardEventScored, markCardEventScored }) => {
        const points = calculateCardPoints(card);
        if (points > 0) {
          get().addFloatingScore(points, scoreX, scoreY, card.rank, card.isPremium);
        }
        
        // Also trigger points event (using separate tracking from level-up scoring)
        if (endElement && !isCardEventScored(card.id)) {
          markCardEventScored(card.id);
          const endRect = endElement.getBoundingClientRect();
          const dropX = endRect.left + endRect.width / 2;
          const dropY = endRect.top + endRect.height / 2;
          // Use CARD_POINTS directly for event (not calculateCardPoints result which may be 0)
          const basePoints = CARD_POINTS[card.rank];
          const eventPoints = card.isPremium ? basePoints * 10 : basePoints;
          import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
            triggerCardToFoundation(dropX, dropY, eventPoints);
          });
        }
      });
      
      // Check if card has a key - fly from START position (before card moves)
      collectKeyFromCard(card.id, centerX, centerY);
    } else {
      // Fallback - collect key without animation position
      collectKeyFromCard(card.id);
    }
    
    // NOW remove card from tableau AND flip the card underneath
    const state = get();
    let cardRemovedFromTableau = false;
    
    for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
      const column = state.tableau[colIndex];
      if (column.length > 0 && column[column.length - 1].id === card.id) {
        const newTableau = [...state.tableau];
        newTableau[colIndex] = column.slice(0, -1);
        
        let cardWasFlipped = false;
        if (newTableau[colIndex].length > 0 && !newTableau[colIndex][newTableau[colIndex].length - 1].faceUp) {
          newTableau[colIndex] = [...newTableau[colIndex]];
          newTableau[colIndex][newTableau[colIndex].length - 1] = { 
            ...newTableau[colIndex][newTableau[colIndex].length - 1], 
            faceUp: true 
          };
          cardWasFlipped = true;
        }
        
        // If a card was flipped, ensure game remains solvable
        if (cardWasFlipped) {
          const tempState = { ...state, tableau: newTableau };
          const solvableState = ensureSolvability(tempState);
          set({ tableau: solvableState.tableau, stock: solvableState.stock });
        } else {
          set({ tableau: newTableau });
        }
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
  
  moveFoundationToTableau: (card, suit, startElement) => {
    const state = get();
    
    // Find a valid tableau column for this card
    const targetColumnIndex = get().findTableauPlacementForCard(card);
    if (targetColumnIndex === null) {
      return false; // No valid placement
    }
    
    // Save state for undo
    saveStateToHistory({
      tableau: state.tableau,
      foundations: state.foundations,
      stock: state.stock,
      waste: state.waste,
      foundationSlotOrder: state.foundationSlotOrder,
    });
    
    // Remove card from foundation
    const newFoundations = { ...state.foundations };
    newFoundations[suit] = state.foundations[suit].slice(0, -1);
    
    // Add card to target tableau column
    const newTableau = [...state.tableau];
    newTableau[targetColumnIndex] = [...newTableau[targetColumnIndex], card];
    
    // Find target element for animation
    const targetColumn = state.tableau[targetColumnIndex];
    let endElement: HTMLElement | null = null;
    
    if (targetColumn.length > 0) {
      const lastCard = targetColumn[targetColumn.length - 1];
      endElement = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
    } else {
      endElement = document.querySelector(`[data-tableau-column="${targetColumnIndex}"]`) as HTMLElement;
    }
    
    if (startElement && endElement) {
      const startRect = startElement.getBoundingClientRect();
      const endRect = endElement.getBoundingClientRect();
      
      // Calculate vertical offset
      const isMobile = isMobileDevice();
      let baseOffset = 0;
      
      if (targetColumn.length > 0) {
        const lastCard = targetColumn[targetColumn.length - 1];
        baseOffset = getCardOffset(lastCard.faceUp, isMobile);
      }
      
      const gameBoard = document.querySelector('[data-game-board]') as HTMLElement;
      const scale = gameBoard ? parseFloat(gameBoard.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1') : 1;
      const verticalOffset = baseOffset * scale;
      
      // ATOMIC: Update ALL state in one set() call to avoid waste pile glitch
      set({
        foundations: newFoundations,
        tableau: newTableau,
        canUndo: true,
        animatingCard: {
          card,
          startPosition: { x: startRect.left, y: startRect.top },
          endPosition: { x: endRect.left, y: endRect.top + verticalOffset },
          targetSuit: card.suit,
          cardStartPosition: null,
          isTableauMove: true,
          targetTableauColumn: targetColumnIndex
        }
      });
      
      // Just clear animation after it completes
      setTimeout(() => {
        const currentState = get();
        if (currentState.animatingCard?.card.id === card.id) {
          set({ animatingCard: null });
        }
      }, 200);
    } else {
      // No animation, move immediately
      set({
        foundations: newFoundations,
        tableau: newTableau,
        canUndo: true
      });
    }
    
    return true;
  },
  
  autoMoveToTableau: (card, targetColumnIndex, startElement) => {
    const state = get();
    const targetColumn = state.tableau[targetColumnIndex];
    
    // Save state for undo before the move
    saveStateToHistory({
      tableau: state.tableau,
      foundations: state.foundations,
      stock: state.stock,
      waste: state.waste,
      foundationSlotOrder: state.foundationSlotOrder,
    });
    set({ canUndo: true });
    
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
      const isMobile = isMobileDevice();
      let baseOffset = 0;
      
      if (targetColumn.length > 0) {
        const lastCard = targetColumn[targetColumn.length - 1];
        // Use smart spacing from central constants
        baseOffset = getCardOffset(lastCard.faceUp, isMobile);
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
    
    // Save state for undo before the move
    saveStateToHistory({
      tableau: state.tableau,
      foundations: state.foundations,
      stock: state.stock,
      waste: state.waste,
      foundationSlotOrder: state.foundationSlotOrder,
    });
    set({ canUndo: true });
    
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
      const isMobile = isMobileDevice();
      let baseOffset = 0;
      
      if (targetColumn.length > 0) {
        const lastCard = targetColumn[targetColumn.length - 1];
        // Use smart spacing from central constants
        baseOffset = getCardOffset(lastCard.faceUp, isMobile);
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
    
    // Check if this is an undo animation - apply previous state
    if (animating?.isUndoAnimation && animating.undoPreviousState) {
      const previousState = animating.undoPreviousState;
      set({
        tableau: previousState.tableau,
        foundations: previousState.foundations,
        stock: previousState.stock,
        waste: previousState.waste,
        foundationSlotOrder: previousState.foundationSlotOrder,
        canUndo: moveHistory.length > 0,
        hasNoMoves: false,
        hint: null,
        animatingCard: null,
      });
      isUndoInProgress = false;
      lastUndoCompletedAt = Date.now();
      return;
    }
    
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
    
    // Note: triggerCardToFoundation is now called in autoMoveToFoundation (together with calculateCardPoints)
    // to ensure points are added before isCardScored returns true
    // Key collection was also triggered there (at card start position)
    
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
      // Award XP for winning and mark first win
      awardWinXP();
      markFirstWin();
      
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
  
  // Auto-draw from stock until we find a card that can go to foundation or complete a full cycle
  autoDrawUntilFoundOrCycled: () => {
    const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Check if waste top card can go to foundation
    const canWasteGoToFoundation = (): boolean => {
      const currentState = get();
      if (currentState.waste.length === 0) return false;
      const wasteTop = currentState.waste[currentState.waste.length - 1];
      if (!wasteTop) return false;
      const foundation = currentState.foundations[wasteTop.suit];
      if (wasteTop.rank === 'A' && foundation.length === 0) return true;
      if (foundation.length > 0) {
        const topCard = foundation[foundation.length - 1];
        if (rankOrder.indexOf(wasteTop.rank) === rankOrder.indexOf(topCard.rank) + 1) return true;
      }
      return false;
    };
    
    // Check if any tableau top card can go to foundation
    const canTableauGoToFoundation = (): boolean => {
      const currentState = get();
      for (const column of currentState.tableau) {
        if (column.length === 0) continue;
        const topCard = column[column.length - 1];
        if (!topCard || !topCard.faceUp) continue;
        const foundation = currentState.foundations[topCard.suit];
        if (topCard.rank === 'A' && foundation.length === 0) return true;
        if (foundation.length > 0) {
          const foundationTop = foundation[foundation.length - 1];
          if (rankOrder.indexOf(topCard.rank) === rankOrder.indexOf(foundationTop.rank) + 1) return true;
        }
      }
      return false;
    };
    
    let drawCount = 0;
    const maxDraws = 100; // Safety limit (increased for full deck cycling)
    let recycleCount = 0; // Track how many times we've recycled the stock
    const maxRecycles = 3; // Maximum number of full cycles before giving up
    
    const tryDraw = () => {
      const currentState = get();
      
      // Check if game is won - stop immediately
      const totalInFoundations = Object.values(currentState.foundations).reduce((sum, f) => sum + f.length, 0);
      if (totalInFoundations === 52) {
        set({ isAutoCollecting: false });
        return;
      }
      
      // Check if we can move something now
      if (canTableauGoToFoundation() || canWasteGoToFoundation()) {
        // Found a card - continue with normal auto-collect
        set({ isAutoCollecting: false });
        setTimeout(() => {
          get().triggerAutoCollect();
        }, 50); // Faster retry
        return;
      }
      
      // If both stock and waste are empty, we're done
      if (currentState.stock.length === 0 && currentState.waste.length === 0) {
        set({ isAutoCollecting: false });
        return;
      }
      
      // Check if stock is empty - need to recycle waste
      if (currentState.stock.length === 0 && currentState.waste.length > 0) {
        recycleCount++;
        
        // Check if we've cycled too many times without progress
        if (recycleCount > maxRecycles) {
          set({ isAutoCollecting: false });
          return;
        }
        
        // Recycle waste to stock
        const recycledStock = [...currentState.waste].reverse().map(c => ({ ...c, faceUp: false }));
        set({ stock: recycledStock, waste: [] });
        
        // Continue drawing after recycle
        setTimeout(tryDraw, 100);
        return;
      }
      
      // Safety check
      drawCount++;
      if (drawCount > maxDraws) {
        set({ isAutoCollecting: false });
        return;
      }
      
      // Perform draw without animation during auto-collect
      const newStock = [...currentState.stock];
      const newWaste = [...currentState.waste];
      
      // Draw 1 card
      if (newStock.length > 0) {
        const drawnCard = newStock.pop()!;
        drawnCard.faceUp = true;
        newWaste.push(drawnCard);
        
        set({ stock: newStock, waste: newWaste });
      }
      
      // Continue after small delay for visual feedback
      setTimeout(tryDraw, 80); // Faster drawing
    };
    
    // Start the draw cycle
    tryDraw();
  },
  
  clearNoMoves: () => {
    set({ hasNoMoves: false });
  },
  
  undo: () => {
    const state = get();
    
    // Block undo if animation is in progress or undo is already in progress
    if (state.animatingCard || isUndoInProgress) {
      return;
    }
    
    if (moveHistory.length === 0) {
      return;
    }
    
    isUndoInProgress = true;
    const previousState = moveHistory.pop()!;
    
    // Try to detect if last move was to foundation (for animated undo)
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    let movedToFoundation: { card: Card; suit: Suit; fromTableauCol?: number; fromWaste?: boolean } | null = null;
    
    for (const suit of suits) {
      const currentCount = state.foundations[suit].length;
      const previousCount = previousState.foundations[suit].length;
      
      if (currentCount > previousCount) {
        // Card was moved TO foundation - we need to animate it back
        const card = state.foundations[suit][currentCount - 1];
        
        // Find where it came from in previous state
        // Check tableau columns
        for (let colIdx = 0; colIdx < previousState.tableau.length; colIdx++) {
          const prevCol = previousState.tableau[colIdx];
          if (prevCol.length > 0) {
            const topCard = prevCol[prevCol.length - 1];
            if (topCard.id === card.id) {
              movedToFoundation = { card, suit, fromTableauCol: colIdx };
              break;
            }
          }
        }
        
        // Check waste
        if (!movedToFoundation && previousState.waste.length > 0) {
          const wasteTop = previousState.waste[previousState.waste.length - 1];
          if (wasteTop.id === card.id) {
            movedToFoundation = { card, suit, fromWaste: true };
          }
        }
        
        break;
      }
    }
    
    // If we found a card that was moved to foundation, animate it back
    if (movedToFoundation) {
      const { card, suit, fromTableauCol, fromWaste } = movedToFoundation;
      
      // Find the actual card element in foundation for precise start position
      const cardInFoundation = document.querySelector(`[data-foundation-pile="${suit}"] [data-card-id="${card.id}"]`) as HTMLElement;
      const foundationEl = document.querySelector(`[data-foundation-pile="${suit}"]`) as HTMLElement;
      
      let targetEl: HTMLElement | null = null;
      if (fromTableauCol !== undefined) {
        targetEl = document.querySelector(`[data-tableau-column="${fromTableauCol}"]`) as HTMLElement;
      } else if (fromWaste) {
        targetEl = document.querySelector('[data-waste-pile]') as HTMLElement;
      }
      
      const startEl = cardInFoundation || foundationEl;
      
      if (startEl && targetEl) {
        const startRect = startEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        // Calculate end position (where the card should go)
        let endX = targetRect.left;
        let endY = targetRect.top;
        
        if (fromTableauCol !== undefined) {
          // For tableau, find the last card in current column and position below it
          const currentCol = state.tableau[fromTableauCol];
          if (currentCol.length > 0) {
            const lastCard = currentCol[currentCol.length - 1];
            const lastCardEl = document.querySelector(`[data-card-id="${lastCard.id}"]`) as HTMLElement;
            if (lastCardEl) {
              const lastCardRect = lastCardEl.getBoundingClientRect();
              endX = lastCardRect.left;
              // Position below the last card with appropriate offset from central constants
              const offset = getCardOffset(lastCard.faceUp, isMobileDevice());
              endY = lastCardRect.top + offset;
            }
          }
        }
        
        // Start animation from actual card position
        set({
          animatingCard: {
            card,
            startPosition: { 
              x: startRect.left, 
              y: startRect.top 
            },
            endPosition: { x: endX, y: endY },
            targetSuit: suit,
            isUndoAnimation: true,
            undoPreviousState: previousState,
          },
          canUndo: moveHistory.length > 0,
        });
        
        return; // Animation will complete in completeCardAnimation
      }
    }
    
    // Try to detect tableau-to-tableau moves
    // Find which column gained cards and which lost cards
    let movedBetweenTableau: { 
      cards: Card[]; 
      fromCol: number; 
      toCol: number;
      fromCardIndex: number;
    } | null = null;
    
    for (let toCol = 0; toCol < state.tableau.length; toCol++) {
      const currentCol = state.tableau[toCol];
      const previousCol = previousState.tableau[toCol];
      
      // This column gained cards
      if (currentCol.length > previousCol.length) {
        // Find the cards that were added
        const addedCount = currentCol.length - previousCol.length;
        const addedCards = currentCol.slice(-addedCount);
        
        // Find which column they came from
        for (let fromCol = 0; fromCol < previousState.tableau.length; fromCol++) {
          if (fromCol === toCol) continue;
          
          const prevFromCol = previousState.tableau[fromCol];
          const currFromCol = state.tableau[fromCol];
          
          // This column lost cards
          if (prevFromCol.length > currFromCol.length) {
            const lostCount = prevFromCol.length - currFromCol.length;
            if (lostCount === addedCount) {
              // Verify it's the same cards
              const lostCards = prevFromCol.slice(-lostCount);
              if (lostCards[0]?.id === addedCards[0]?.id) {
                movedBetweenTableau = {
                  cards: addedCards,
                  fromCol,
                  toCol,
                  fromCardIndex: currFromCol.length // Where in the source column cards should return
                };
                break;
              }
            }
          }
        }
        if (movedBetweenTableau) break;
      }
    }
    
    // Animate tableau-to-tableau move back
    if (movedBetweenTableau) {
      const { cards, fromCol, toCol } = movedBetweenTableau;
      
      // Find the actual first card element for precise start position
      const firstCardEl = document.querySelector(`[data-card-id="${cards[0].id}"]`) as HTMLElement;
      const fromColEl = document.querySelector(`[data-tableau-column="${fromCol}"]`) as HTMLElement;
      
      if (fromColEl && firstCardEl) {
        const startRect = firstCardEl.getBoundingClientRect();
        const fromColRect = fromColEl.getBoundingClientRect();
        
        // Calculate end position - find where the card should land
        // If fromCol has cards, find the last one and position below it
        // If empty, position at column top
        let endX = fromColRect.left;
        let endY = fromColRect.top;
        
        const currentFromCol = state.tableau[fromCol];
        if (currentFromCol.length > 0) {
          // Find the last card in the source column and position below it
          const lastCardInFromCol = currentFromCol[currentFromCol.length - 1];
          const lastCardEl = document.querySelector(`[data-card-id="${lastCardInFromCol.id}"]`) as HTMLElement;
          if (lastCardEl) {
            const lastCardRect = lastCardEl.getBoundingClientRect();
            endX = lastCardRect.left;
            // Position below the last card with appropriate offset from central constants
            const offset = getCardOffset(lastCardInFromCol.faceUp, isMobileDevice());
            endY = lastCardRect.top + offset;
          }
        }
        
        // Start animation with the first card (or stack)
        set({
          animatingCard: {
            card: cards[0],
            startPosition: { 
              x: startRect.left, 
              y: startRect.top 
            },
            endPosition: { 
              x: endX, 
              y: endY 
            },
            targetSuit: cards[0].suit,
            isUndoAnimation: true,
            undoPreviousState: previousState,
            isTableauMove: true,
            targetTableauColumn: fromCol,
            stackCards: cards.length > 1 ? cards : undefined,
            isStackMove: cards.length > 1,
          },
          canUndo: moveHistory.length > 0,
        });
        
        return; // Animation will complete in completeCardAnimation
      }
    }
    
    // Try to detect waste-to-tableau moves (card taken from waste and placed on tableau)
    // Check if waste lost a card and tableau gained it
    if (previousState.waste.length > state.waste.length) {
      // Waste had more cards - find where it went
      const wasteCardThatMoved = previousState.waste[previousState.waste.length - 1];
      
      // Check each tableau column for this card
      for (let colIdx = 0; colIdx < state.tableau.length; colIdx++) {
        const currentCol = state.tableau[colIdx];
        const previousCol = previousState.tableau[colIdx];
        
        // This column gained a card
        if (currentCol.length > previousCol.length) {
          const addedCard = currentCol[currentCol.length - 1];
          if (addedCard.id === wasteCardThatMoved.id) {
            // Found: card moved from waste to this tableau column
            const cardEl = document.querySelector(`[data-card-id="${addedCard.id}"]`) as HTMLElement;
            
            // Find the current top card in waste to get precise end position
            // After undo, the card will be at top of waste
            let endX: number;
            let endY: number;
            
            if (state.waste.length > 0) {
              // There are cards in waste - find the top one's position
              const currentTopWasteCard = state.waste[state.waste.length - 1];
              const topWasteCardEl = document.querySelector(`[data-card-id="${currentTopWasteCard.id}"]`) as HTMLElement;
              if (topWasteCardEl) {
                const topWasteRect = topWasteCardEl.getBoundingClientRect();
                // Card will go to the same position as current top (replacing it visually)
                endX = topWasteRect.left;
                endY = topWasteRect.top;
              } else {
                // Fallback to waste pile
                const wasteEl = document.querySelector('[data-waste-pile]') as HTMLElement;
                if (wasteEl) {
                  const wasteRect = wasteEl.getBoundingClientRect();
                  endX = wasteRect.left;
                  endY = wasteRect.top;
                } else {
                  continue;
                }
              }
            } else {
              // Waste is empty - use waste pile position
              const wasteEl = document.querySelector('[data-waste-pile]') as HTMLElement;
              if (wasteEl) {
                const wasteRect = wasteEl.getBoundingClientRect();
                endX = wasteRect.left;
                endY = wasteRect.top;
              } else {
                continue;
              }
            }
            
            if (cardEl) {
              const startRect = cardEl.getBoundingClientRect();
              
              set({
                animatingCard: {
                  card: addedCard,
                  startPosition: { 
                    x: startRect.left, 
                    y: startRect.top 
                  },
                  endPosition: { 
                    x: endX, 
                    y: endY 
                  },
                  targetSuit: addedCard.suit,
                  isUndoAnimation: true,
                  undoPreviousState: previousState,
                },
                canUndo: moveHistory.length > 0,
              });
              
              return; // Animation will complete in completeCardAnimation
            }
          }
        }
      }
    }
    
    // Try to detect draw card (stock to waste) - animate card back to stock
    if (state.waste.length > previousState.waste.length && 
        state.stock.length < previousState.stock.length) {
      // Cards were drawn from stock to waste - animate back
      const drawnCards: Card[] = [];
      for (let i = previousState.waste.length; i < state.waste.length; i++) {
        drawnCards.push(state.waste[i]);
      }
      
      if (drawnCards.length > 0) {
        // Find the top waste card element
        const topWasteCard = drawnCards[drawnCards.length - 1];
        const cardEl = document.querySelector(`[data-card-id="${topWasteCard.id}"]`) as HTMLElement;
        const stockEl = document.querySelector('[data-stock-pile]') as HTMLElement;
        
        if (cardEl && stockEl) {
          const startRect = cardEl.getBoundingClientRect();
          const stockRect = stockEl.getBoundingClientRect();
          
          set({
            animatingCard: {
              card: topWasteCard,
              startPosition: { 
                x: startRect.left, 
                y: startRect.top 
              },
              endPosition: { 
                x: stockRect.left, 
                y: stockRect.top 
              },
              targetSuit: topWasteCard.suit,
              isUndoAnimation: true,
              undoPreviousState: previousState,
            },
            canUndo: moveHistory.length > 0,
          });
          
          return; // Animation will complete in completeCardAnimation
        }
      }
    }
    
    // Try to detect foundation-to-tableau moves (card moved from foundation to tableau via click)
    // Check if any foundation lost a card and tableau gained it
    for (const suit of suits) {
      const currentCount = state.foundations[suit].length;
      const previousCount = previousState.foundations[suit].length;
      
      if (currentCount < previousCount) {
        // Foundation lost a card - find which tableau column gained it
        const lostCard = previousState.foundations[suit][previousCount - 1];
        
        for (let colIdx = 0; colIdx < state.tableau.length; colIdx++) {
          const currentCol = state.tableau[colIdx];
          const previousCol = previousState.tableau[colIdx];
          
          // This column gained a card
          if (currentCol.length > previousCol.length) {
            const addedCard = currentCol[currentCol.length - 1];
            if (addedCard.id === lostCard.id) {
              // Found: card moved from foundation to this tableau column
              const cardEl = document.querySelector(`[data-card-id="${addedCard.id}"]`) as HTMLElement;
              const foundationEl = document.querySelector(`[data-foundation-pile="${suit}"]`) as HTMLElement;
              
              if (cardEl && foundationEl) {
                const startRect = cardEl.getBoundingClientRect();
                const foundationRect = foundationEl.getBoundingClientRect();
                
                set({
                  animatingCard: {
                    card: addedCard,
                    startPosition: { 
                      x: startRect.left, 
                      y: startRect.top 
                    },
                    endPosition: { 
                      x: foundationRect.left, 
                      y: foundationRect.top 
                    },
                    targetSuit: suit,
                    isUndoAnimation: true,
                    undoPreviousState: previousState,
                  },
                  canUndo: moveHistory.length > 0,
                });
                
                return; // Animation will complete in completeCardAnimation
              }
            }
          }
        }
        
        break; // Only one card can be moved at a time
      }
    }
    
    // No animated undo possible - apply state immediately
    set({
      tableau: previousState.tableau,
      foundations: previousState.foundations,
      stock: previousState.stock,
      waste: previousState.waste,
      foundationSlotOrder: previousState.foundationSlotOrder,
      canUndo: moveHistory.length > 0,
      hasNoMoves: false,
      hint: null,
    });
    
    isUndoInProgress = false;
    lastUndoCompletedAt = Date.now();
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
    
    // Check if all tableau cards are revealed (or tableau is empty/only has top cards)
    const allTableauRevealed = state.tableau.every(col => col.every(c => c.faceUp));
    
    for (const card of allStockWasteCards) {
      // Can this card go to foundation?
      if (get().canAutoMoveToFoundation(card)) {
        hasUsefulCardInDeck = true;
        break;
      }
      
      // If all tableau is revealed, check if card could EVENTUALLY go to foundation
      // (i.e., its rank is not already complete in foundations)
      if (allTableauRevealed) {
        const foundation = state.foundations[card.suit];
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const cardRankIdx = rankOrder.indexOf(card.rank);
        const foundationTopIdx = foundation.length > 0 ? rankOrder.indexOf(foundation[foundation.length - 1].rank) : -1;
        
        // If this card's rank is greater than what's in foundation, it can eventually go there
        if (cardRankIdx > foundationTopIdx) {
          hasUsefulCardInDeck = true;
          break;
        }
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
    
    // Special case: if tableau is all revealed and there are cards in stock/waste,
    // trigger auto-collect which will handle drawing automatically
    if (allTableauRevealed && allStockWasteCards.length > 0) {
      // Don't show "no moves" - let auto-collect handle it
      setTimeout(() => {
        const currentState = get();
        if (!currentState.isAutoCollecting && !currentState.isWon) {
          get().triggerAutoCollect();
        }
      }, 100);
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
    
    // Before showing "no moves", check if game is actually won
    // (all 52 cards in foundations - animation might still be in progress)
    const totalInFoundations = Object.values(state.foundations).reduce((sum, f) => sum + f.length, 0);
    if (totalInFoundations === 52) {
      // Game is won, not "no moves"
      if (!state.isWon) {
        set({ isWon: true });
      }
      return;
    }
    
    // Also check if animation is in progress - don't show "no moves" while cards are flying
    if (state.animatingCard || state.isAutoCollecting) {
      return;
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
    
    // Check if there are any cards that can be moved to foundations from tableau/waste
    const canMoveFromTableauOrWaste = () => {
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
      
      // Check tableau top cards (only face-up cards)
      for (const column of state.tableau) {
        const topCard = column[column.length - 1];
        if (column.length > 0 && topCard.faceUp && checkCard(topCard)) return true;
      }
      // Check waste top card
      if (state.waste.length > 0 && checkCard(state.waste[state.waste.length - 1])) return true;
      return false;
    };
    
    // Check if there are cards in stock/waste that could eventually go to foundation
    const hasCardsInStockOrWaste = state.stock.length > 0 || state.waste.length > 0;
    
    // If no immediate moves and no stock/waste to cycle through, stop
    if (!canMoveFromTableauOrWaste() && !hasCardsInStockOrWaste) {
      return;
    }
    
    // If no immediate moves but has stock - we'll auto-draw to find cards
    if (!canMoveFromTableauOrWaste() && hasCardsInStockOrWaste) {
      // Start auto-draw cycle to find cards
      set({ isAutoCollecting: true });
      get().autoDrawUntilFoundOrCycled();
      return;
    }
    
    // Set auto-collecting state to block user input
    set({ isAutoCollecting: true });
    
    // Animation settings - smooth and consistent pace
    const FLIGHT_DURATION = 180; // Flight time per card (slightly longer for smoothness)
    const STAGGER_DELAY = 85; // Delay between card launches (52 cards * 85ms = ~4.4 sec for full collect)
    
    // Collect ALL cards that need to move to foundations
    const cardsToMove: Array<{
      card: Card;
      targetSuit: Suit;
      sourceType: 'tableau' | 'waste';
      sourceIndex?: number;
    }> = [];
    
    // Build a simulation to find card order
    let simTableau = state.tableau.map(col => [...col]);
    let simWaste = [...state.waste];
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
          // Only check face-up cards
          if (!topCard.faceUp) continue;
          const suit = canMoveToFoundation(topCard);
          if (suit) {
            cardsToMove.push({ card: topCard, targetSuit: suit, sourceType: 'tableau', sourceIndex: i });
            // Remove card and flip the one underneath if face-down
            const newColumn = column.slice(0, -1);
            if (newColumn.length > 0 && !newColumn[newColumn.length - 1].faceUp) {
              newColumn[newColumn.length - 1] = { ...newColumn[newColumn.length - 1], faceUp: true };
            }
            simTableau[i] = newColumn;
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
      
      // No more cards to move from tableau or waste - stop simulation
      // (Stock cards will be handled by autoDrawUntilFoundOrCycled)
      if (!foundCard) break;
    }
    
    if (cardsToMove.length === 0) {
      // No cards from tableau/waste, but check if there are cards in stock that need processing
      const hasStockCards = state.stock.length > 0 || state.waste.length > 0;
      if (hasStockCards) {
        // Start auto-draw cycle to find cards in stock
        set({ isAutoCollecting: true });
        get().autoDrawUntilFoundOrCycled();
      } else {
        set({ isAutoCollecting: false });
      }
      return;
    }
    
    // Note: We save history BEFORE EACH card move (inside animation callback)
    // This allows undo to return cards one by one, not all at once
    
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
            // Immediately retry auto-collect in case there are other cards to move
            setTimeout(() => {
              const checkState = get();
              if (!checkState.isWon && !checkState.isAutoCollecting) {
                get().triggerAutoCollect();
              }
            }, 10); // Minimal delay for smooth continuation
          }
          return;
        }
        
        // Get DOM elements FIRST - before updating state
        const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
        if (!cardElement) {
          completedCards++;
          if (completedCards >= totalCards) set({ isAutoCollecting: false });
          return;
        }
        const startRect = cardElement.getBoundingClientRect();
        // Hide the original card immediately
        cardElement.style.visibility = 'hidden';
        
        const foundationElement = document.querySelector(`[data-foundation-pile="${targetSuit}"]`) as HTMLElement;
        
        if (!foundationElement) {
          completedCards++;
          if (completedCards >= totalCards) set({ isAutoCollecting: false });
          return;
        }
        
        // Save state BEFORE updating foundation for undo (allows undo one card at a time)
        const stateForFoundation = get();
        saveStateToHistory({
          tableau: stateForFoundation.tableau,
          foundations: stateForFoundation.foundations,
          stock: stateForFoundation.stock,
          waste: stateForFoundation.waste,
          foundationSlotOrder: stateForFoundation.foundationSlotOrder,
        });
        
        // NOW update foundations - only after all DOM elements are validated
        // Other cards checking canAdd will see this card already in foundation
        const newFoundations = { ...stateForFoundation.foundations };
        newFoundations[targetSuit] = [...newFoundations[targetSuit], card];
        set({ foundations: newFoundations, canUndo: true });
        
        const endRect = foundationElement.getBoundingClientRect();
        
        // Launch flying card animation
        import('../../components/solitaire/FlyingCard').then(({ launchFlyingCard }) => {
          launchFlyingCard({ ...card, faceUp: true }, startRect, endRect, FLIGHT_DURATION, () => {
            movedCardIds.add(card.id);
            completedCards++;
            
            // Update source (remove card) - foundation already updated, history already saved
            const currentState = get();
            
            // Check if undo was performed - card should still be in foundation
            // If card is not in foundation, undo was done and we shouldn't modify state
            const cardStillInFoundation = currentState.foundations[targetSuit].some(c => c.id === card.id);
            if (!cardStillInFoundation) {
              // Undo was performed, don't modify state
              if (completedCards >= totalCards) {
                set({ isAutoCollecting: false });
              }
              return;
            }
            
            if (sourceType === 'tableau' && sourceIndex !== undefined) {
              const newTableau = currentState.tableau.map((col, i) => {
                if (i === sourceIndex) {
                  let filtered = col.filter(c => c.id !== card.id);
                  // Flip card underneath if face down
                  if (filtered.length > 0 && !filtered[filtered.length - 1].faceUp) {
                    filtered = [...filtered.slice(0, -1), { ...filtered[filtered.length - 1], faceUp: true }];
                  }
                  return filtered;
                }
                return col;
              });
              awardCardXP(card.id);
              set({ tableau: newTableau, moves: currentState.moves + 1 });
            } else if (sourceType === 'waste') {
              const newWaste = currentState.waste.filter(c => c.id !== card.id);
              awardCardXP(card.id);
              set({ waste: newWaste, moves: currentState.moves + 1 });
            }
            
            // Trigger collection item drop and add points
            const dropX = endRect.left + endRect.width / 2;
            const dropY = endRect.top + endRect.height / 2;
            import('../solitaire/scoring').then(({ calculateCardPoints, CARD_POINTS, isCardEventScored, markCardEventScored }) => {
              // For level-up scoring
              const points = calculateCardPoints(card);
              if (points > 0) {
                get().addPointsToProgress(points);
              }
              
              // For event scoring (separate tracking)
              if (!isCardEventScored(card.id)) {
                markCardEventScored(card.id);
                const eventPoints = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
                import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
                  triggerCardToFoundation(dropX, dropY, eventPoints);
                });
              }
            });
            
            // Check if all done
            if (completedCards >= totalCards) {
              const finalState = get();
              const totalInFoundations = Object.values(finalState.foundations).reduce((sum, f) => sum + f.length, 0);
              
              if (totalInFoundations === 52 && !finalState.isWon) {
                awardWinXP();
                markFirstWin();
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
                // Re-trigger auto-collect immediately for smooth continuation
                setTimeout(() => {
                  const checkState = get();
                  if (!checkState.isWon && !checkState.isAutoCollecting) {
                    get().triggerAutoCollect();
                  }
                }, 10);
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
        
        // Collect key if card has one (IMPORTANT: was missing!)
        collectKeyFromCard(card.id, centerX, centerY);
      }, index * STAGGER_DELAY);
    });
    
    // Safety timeout - ensure auto-collect ends and retries if needed
    const maxTime = cardsToMove.length * STAGGER_DELAY + FLIGHT_DURATION + 300;
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
          }, 10);
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
    
    // Note: We save history BEFORE EACH card move (inside animation callback)
    // This allows undo to return cards one by one, not all at once
    
    // Animation settings
    const FLIGHT_DURATION = 150;
    const STAGGER_DELAY = 80;
    
    // Pre-collect all card elements and positions BEFORE any changes
    const cardData: Map<string, { element: HTMLElement; rect: DOMRect }> = new Map();
    cardsToMove.forEach(({ card }) => {
      const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
      if (cardElement) {
        cardData.set(card.id, { 
          element: cardElement, 
          rect: cardElement.getBoundingClientRect() 
        });
      }
    });
    
    // Reserve foundation slots for all suits FIRST (before animations start)
    const stateForSlots = get();
    const suitsNeeded = new Set(cardsToMove.map(m => m.card.suit));
    let newSlotOrder = [...stateForSlots.foundationSlotOrder];
    suitsNeeded.forEach(suit => {
      if (!newSlotOrder.includes(suit)) {
        newSlotOrder.push(suit);
      }
    });
    if (newSlotOrder.length !== stateForSlots.foundationSlotOrder.length) {
      set({ foundationSlotOrder: newSlotOrder });
    }
    
    // Wait for foundation slots to render
    setTimeout(() => {
      // Launch animations with stagger - hide card visually, then animate
      cardsToMove.forEach((moveInfo, index) => {
        setTimeout(() => {
          const { card, source, columnIndex } = moveInfo;
          
          const data = cardData.get(card.id);
          if (!data) {
            // Card not found - skip (shouldn't happen)
            console.warn(`Card ${card.id} data not found`);
            return;
          }
          
          const { element: cardElement, rect: startRect } = data;
          
          // Hide the original card visually (but keep in DOM for position reference)
          cardElement.style.visibility = 'hidden';
          
          const foundationElement = document.querySelector(`[data-foundation-pile="${card.suit}"]`) as HTMLElement;
          if (!foundationElement) {
            console.warn(`Foundation for ${card.suit} not found`);
            // Still need to remove card from state and add to foundation
            cardElement.style.visibility = 'visible';
            return;
          }
          
          // Trigger flying suit icon and score
          const centerX = startRect.left + startRect.width / 2;
          const centerY = startRect.top + startRect.height / 2;
          import('../flyingSuitIconManager').then(({ addFlyingSuitIcon }) => {
            addFlyingSuitIcon(card.suit, centerX, centerY);
          });
          import('../solitaire/scoring').then(({ calculateCardPoints }) => {
            const points = calculateCardPoints(card);
            if (points > 0) {
              get().addFloatingScore(points, startRect.left - 20, startRect.top + startRect.height / 2, card.rank, card.isPremium);
            }
          });
          
          const endRect = foundationElement.getBoundingClientRect();
          
          // Launch flying card animation
          import('../../components/solitaire/FlyingCard').then(({ launchFlyingCard }) => {
            launchFlyingCard({ ...card, faceUp: true }, startRect, endRect, FLIGHT_DURATION, () => {
              // AFTER animation completes:
              // 1. Save state for undo (before each card move)
              // 2. Remove card from source
              // 3. Add card to foundation
              const stateAfterFlight = get();
              
              // Check if card is still in source - if not, undo was performed
              let cardStillInSource = false;
              if (source === 'tableau' && columnIndex !== undefined) {
                cardStillInSource = stateAfterFlight.tableau[columnIndex].some(c => c.id === card.id);
              } else if (source === 'waste') {
                cardStillInSource = stateAfterFlight.waste.some(c => c.id === card.id);
              }
              
              if (!cardStillInSource) {
                // Undo was performed, don't modify state
                return;
              }
              
              // Save state BEFORE this move for undo (allows undo one card at a time)
              saveStateToHistory({
                tableau: stateAfterFlight.tableau,
                foundations: stateAfterFlight.foundations,
                stock: stateAfterFlight.stock,
                waste: stateAfterFlight.waste,
                foundationSlotOrder: stateAfterFlight.foundationSlotOrder,
              });
              
              // Remove from source
              if (source === 'tableau' && columnIndex !== undefined) {
                const newTableau = stateAfterFlight.tableau.map((col, i) => {
                  if (i === columnIndex) {
                    let filtered = col.filter(c => c.id !== card.id);
                    // Flip card underneath if face down
                    if (filtered.length > 0 && !filtered[filtered.length - 1].faceUp) {
                      filtered = [...filtered.slice(0, -1), { ...filtered[filtered.length - 1], faceUp: true }];
                    }
                    return filtered;
                  }
                  return col;
                });
                
                const newFoundations = { ...stateAfterFlight.foundations };
                newFoundations[card.suit] = [...(newFoundations[card.suit] || []), card];
                
                awardCardXP(card.id);
                set({ 
                  tableau: newTableau,
                  foundations: newFoundations,
                  moves: stateAfterFlight.moves + 1,
                  canUndo: true
                });
              } else if (source === 'waste') {
                const newWaste = stateAfterFlight.waste.filter(c => c.id !== card.id);
                const newFoundations = { ...stateAfterFlight.foundations };
                newFoundations[card.suit] = [...(newFoundations[card.suit] || []), card];
                
                awardCardXP(card.id);
                set({ 
                  waste: newWaste,
                  foundations: newFoundations,
                  moves: stateAfterFlight.moves + 1,
                  canUndo: true
                });
              }
              
              // Trigger collection item drop and key collection
              const fRect = foundationElement.getBoundingClientRect();
              const dropX = fRect.left + fRect.width / 2;
              const dropY = fRect.top + fRect.height / 2;
              
              import('../solitaire/scoring').then(({ CARD_POINTS, isCardEventScored, markCardEventScored }) => {
                // Only trigger collection if card hasn't earned event points yet
                if (!isCardEventScored(card.id)) {
                  markCardEventScored(card.id);
                  const points = card.isPremium ? CARD_POINTS[card.rank] * 10 : CARD_POINTS[card.rank];
                  import('../../components/solitaire/FlyingCollectionIcon').then(({ triggerCardToFoundation }) => {
                    triggerCardToFoundation(dropX, dropY, points);
                  });
                }
              });
              
              // Collect key if card has one
              collectKeyFromCard(card.id, dropX, dropY);
              
              // Check win
              const winState = get();
              const totalInFoundations = Object.values(winState.foundations).reduce((sum, f) => sum + f.length, 0);
              if (totalInFoundations === 52 && !winState.isWon) {
                awardWinXP();
                markFirstWin();
                set({ isWon: true });
              }
            });
          });
        }, index * STAGGER_DELAY);
      });
    }, 20);
  }
}));
