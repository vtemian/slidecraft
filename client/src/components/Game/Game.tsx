import type { Puzzle, Direction } from '@slidecraft/shared';
import { Board } from '../Board';
import { Ship } from '../Ship';
import { Timer } from '../Timer';
import { Celebration } from '../Celebration';
import { ResultsScreen } from '../ResultsScreen';
import { useGame } from './useGame';
import './Game.css';

interface GameProps {
  puzzle: Puzzle;
}

export function Game({ puzzle }: GameProps) {
  const {
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
    handleCelebrationComplete,
    closeResults,
  } = useGame(puzzle);

  if (!gameState) return null;

  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  const directionSymbols: Record<Direction, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
  };

  return (
    <div className="game">
      <div className="game__header">
        <h1 className="game__title">SlideCraft #{puzzle.id}</h1>
        <div className="game__stats">
          <span className="game__moves">
            Moves: <strong>{gameState.moveCount}</strong>
            <span className="game__optimal"> / {puzzle.optimalMoves}</span>
          </span>
          <Timer
            startTime={gameState.startTime}
            running={!gameState.completed}
            finalTime={gameState.completionTime}
          />
        </div>
      </div>

      <div className="game__board-container" ref={boardRef}>
        <Board obstacles={puzzle.obstacles} astronaut={puzzle.astronaut}>
          {gameState.ships.map((ship) => (
            <Ship
              key={ship.color}
              ship={ship}
              selected={selectedShip === ship.color}
              onClick={() => selectShip(ship.color)}
              cellSize={cellSize}
            />
          ))}
        </Board>
      </div>

      <div className="game__controls">
        <button
          className="game__button"
          onClick={reset}
          disabled={gameState.completed}
        >
          Reset
        </button>
      </div>

      <div className="game__direction-buttons">
        {directions.map((dir) => (
          <button
            key={dir}
            className={`game__direction-button game__direction-button--${dir}`}
            onClick={() => moveShip(dir)}
            disabled={!selectedShip || gameState.completed}
            aria-label={`Move ${dir}`}
          >
            {directionSymbols[dir]}
          </button>
        ))}
      </div>

      <div className="game__instructions">
        {!selectedShip && !gameState.completed && (
          <p>Click a ship to select it, then use arrow keys or buttons to move</p>
        )}
        {selectedShip && !gameState.completed && (
          <p>
            <span className={`game__selected-indicator game__selected-indicator--${selectedShip}`}>
              ●
            </span>
            {' '}ship selected - press arrow keys or buttons to move
          </p>
        )}
      </div>

      <Celebration active={showCelebration} onComplete={handleCelebrationComplete} />

      {showResults && gameResult && (
        <ResultsScreen
          puzzle={puzzle}
          moveCount={gameState.moveCount}
          timeSeconds={gameState.completionTime || 0}
          starRating={gameResult.starRating}
          stats={gameResult.stats}
          onClose={closeResults}
        />
      )}
    </div>
  );
}
