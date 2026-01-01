import type { StarRating as StarRatingType } from '@slidecraft/shared';
import './StarRating.css';

interface StarRatingProps {
  rating: StarRatingType;
  animated?: boolean;
}

export function StarRating({ rating, animated = false }: StarRatingProps) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    stars.push(
      <span
        key={i}
        className={`star-rating__star ${filled ? 'star-rating__star--filled' : 'star-rating__star--empty'}`}
        role="img"
        aria-label={filled ? 'filled star' : 'empty star'}
      >
        ★
      </span>
    );
  }

  return (
    <div
      className={`star-rating ${animated ? 'star-rating--animated' : ''}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {stars}
    </div>
  );
}
