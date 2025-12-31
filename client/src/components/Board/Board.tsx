import type { Position, Obstacle } from '@slidecraft/shared';
import './Board.css';

interface BoardProps {
  obstacles: Obstacle[];
  astronaut: Position;
  children?: React.ReactNode;
}

export function Board({ obstacles, astronaut, children }: BoardProps) {
  const cells = [];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isAstronaut = astronaut.x === x && astronaut.y === y;
      const cellObstacles = obstacles.filter(
        (o) => o.position.x === x && o.position.y === y
      );

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`cell ${isAstronaut ? 'cell--astronaut' : ''}`}
          data-x={x}
          data-y={y}
        >
          {cellObstacles.map((obstacle, i) => {
            if (obstacle.type === 'asteroid') {
              return <div key={i} className="asteroid" />;
            }
            return (
              <div
                key={i}
                className={`force-field force-field--${obstacle.edge}`}
              />
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="board">
      {cells}
      {children}
    </div>
  );
}
