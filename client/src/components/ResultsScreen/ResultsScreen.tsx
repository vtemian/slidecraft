import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Puzzle, StarRating as StarRatingType, PlayerStats } from '@slidecraft/shared';
import { StarRating } from '../StarRating';
import './ResultsScreen.css';

interface ResultsScreenProps {
  puzzle: Puzzle;
  moveCount: number;
  timeSeconds: number;
  starRating: StarRatingType;
  stats: PlayerStats | null;
  onClose: () => void;
}

export function ResultsScreen({
  puzzle,
  moveCount,
  timeSeconds,
  starRating,
  stats,
  onClose,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateShareText = (): string => {
    const stars = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
    return `SlideCraft #${puzzle.id}
${stars}
Moves: ${moveCount}/${puzzle.optimalMoves}
Time: ${formatTime(timeSeconds)}`;
  };

  const handleShare = async () => {
    const text = generateShareText();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="results-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="results-screen__content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h2 className="results-screen__title">Rescue Complete!</h2>
          <p className="results-screen__puzzle-number">SlideCraft #{puzzle.id}</p>

          <div className="results-screen__stars">
            <StarRating rating={starRating} animated />
          </div>

          <div className="results-screen__stats">
            <div className="results-screen__stat">
              <div className="results-screen__stat-label">Moves</div>
              <div className="results-screen__stat-value">
                {moveCount}
                <span style={{ opacity: 0.5 }}> / {puzzle.optimalMoves}</span>
              </div>
            </div>
            <div className="results-screen__stat">
              <div className="results-screen__stat-label">Time</div>
              <div className="results-screen__stat-value results-screen__stat-value--highlight">
                {formatTime(timeSeconds)}
              </div>
            </div>
          </div>

          {stats && (
            <div className="results-screen__player-stats">
              <div className="results-screen__player-stats-title">Your Stats</div>
              <div className="results-screen__player-stats-grid">
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.gamesPlayed}</div>
                  <div className="results-screen__player-stat-label">Played</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">
                    {stats.gamesPlayed > 0
                      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                      : 0}%
                  </div>
                  <div className="results-screen__player-stat-label">Win %</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.currentStreak}</div>
                  <div className="results-screen__player-stat-label">Streak</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.maxStreak}</div>
                  <div className="results-screen__player-stat-label">Max</div>
                </div>
              </div>
            </div>
          )}

          <div className="results-screen__actions">
            <button
              className="results-screen__button results-screen__button--primary"
              onClick={handleShare}
            >
              Share
            </button>
            <button
              className="results-screen__button results-screen__button--secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div
            className={`results-screen__share-feedback ${copied ? 'results-screen__share-feedback--visible' : ''}`}
          >
            Copied to clipboard!
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
