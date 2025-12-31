import { motion } from 'framer-motion';
import type { Ship as ShipType } from '@slidecraft/shared';
import './Ship.css';

interface ShipProps {
  ship: ShipType;
  selected: boolean;
  onClick: () => void;
  cellSize: number;
}

export function Ship({ ship, selected, onClick, cellSize }: ShipProps) {
  // Calculate pixel position from grid position
  // Account for board padding (4px) and gap (1px per cell)
  const padding = 4;
  const gap = 1;
  const x = padding + ship.position.x * (cellSize + gap);
  const y = padding + ship.position.y * (cellSize + gap);

  return (
    <motion.div
      className={`ship ship--${ship.color} ${selected ? 'ship--selected' : ''}`}
      style={{
        width: cellSize,
        height: cellSize,
      }}
      animate={{ x, y }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      onClick={onClick}
      role="button"
      aria-label={`${ship.color} ship${selected ? ' (selected)' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="ship__body" />
    </motion.div>
  );
}
