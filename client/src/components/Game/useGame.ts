import { useState, useCallback, useEffect, useRef } from 'react';
import type { Puzzle, GameState, ShipColor, Direction, PlayerStats, StarRating } from '@slidecraft/shared';
import { createGameState, applyMove, resetGameState, calculateStarRating } from '@slidecraft/shared';
import { apiClient } from '../../api';

interface GameResult {
  starRating: StarRating;
  stats: PlayerStats | null;
}

export function useGame(puzzle: Puzzle | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedShip, setSelectedShip] = useState<ShipColor | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);
  const hasSubmittedRef = useRef(false);

  // Initialize game state when puzzle loads
  useEffect(() => {
    if (puzzle) {
      setGameState(createGameState(puzzle));
      setSelectedShip(null);
      setShowCelebration(false);
      setShowResults(false);
      setGameResult(null);
      hasSubmittedRef.current = false;
    }
  }, [puzzle]);

  // Calculate cell size based on board dimensions
  useEffect(() => {
    const updateCellSize = () => {
      if (boardRef.current) {
        const boardWidth = boardRef.current.offsetWidth;
        const padding = 8;
        const gaps = 15;
        const availableWidth = boardWidth - padding - gaps;
        setCellSize(availableWidth / 16);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  // Submit solution when game is completed
  useEffect(() => {
    if (!gameState?.completed || !puzzle || hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;
    setShowCelebration(true);

    const submitSolution = async () => {
      setSubmitting(true);
      try {
        const response = await apiClient.submitSolution({
          puzzleId: puzzle.id,
          moves: gameState.moves,
          timeSeconds: gameState.completionTime || 0,
        });

        setGameResult({
          starRating: response.starRating,
          stats: response.stats,
        });
      } catch (error) {
        console.error('Failed to submit solution:', error);
        // Calculate star rating locally if submission fails
        setGameResult({
          starRating: calculateStarRating(gameState.moveCount, puzzle.optimalMoves),
          stats: null,
        });
      } finally {
        setSubmitting(false);
      }
    };

    submitSolution();
  }, [gameState?.completed, puzzle]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setShowResults(true);
  }, []);

  const selectShip = useCallback((color: ShipColor) => {
    setSelectedShip((current) => (current === color ? null : color));
  }, []);

  const moveShip = useCallback(
    (direction: Direction) => {
      if (!gameState || !selectedShip || gameState.completed) return;

      setGameState((current) => {
        if (!current) return current;
        return applyMove(current, selectedShip, direction);
      });
    },
    [gameState, selectedShip]
  );

  const reset = useCallback(() => {
    if (!gameState) return;
    setGameState(resetGameState(gameState));
    setSelectedShip(null);
  }, [gameState]);

  const closeResults = useCallback(() => {
    setShowResults(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedShip || !gameState || gameState.completed) return;

      const directionMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      const direction = directionMap[e.key];
      if (direction) {
        e.preventDefault();
        moveShip(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShip, gameState, moveShip]);

  return {
    gameState,
    selectedShip,
    selectShip,
    moveShip,
    reset,
    boardRef,
    cellSize,
    showCelebration,
    showResults,
    gameResult,
    submitting,
    handleCelebrationComplete,
    closeResults,
  };
}
