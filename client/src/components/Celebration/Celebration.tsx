import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Celebration.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  xOffset: number;
  duration: number;
}

interface CelebrationProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ['#ffd700', '#ff4444', '#4444ff', '#44ff44', '#ff44ff', '#44ffff'];
const PARTICLE_COUNT = 50;

export function Celebration({ active, onComplete }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (active) {
      // Generate particles
      const newParticles: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -20,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 8 + Math.random() * 12,
          rotation: Math.random() * 360,
          xOffset: (Math.random() - 0.5) * 200,
          duration: 2 + Math.random(),
        });
      }
      setParticles(newParticles);

      // Clear after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onCompleteRef.current?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <div className="celebration">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="celebration__particle"
            style={{
              backgroundColor: particle.color,
              width: particle.size,
              height: particle.size,
              left: particle.x,
              top: particle.y,
            }}
            initial={{
              y: -20,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              y: window.innerHeight + 20,
              opacity: [1, 1, 0],
              rotate: particle.rotation + 720,
              x: particle.x + particle.xOffset,
            }}
            transition={{
              duration: particle.duration,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
