import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function LoadingScreen({ message = 'Loading...', error, onRetry }: LoadingScreenProps) {
  if (error) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__error">
          <p>Something went wrong:</p>
          <p>{error}</p>
        </div>
        {onRetry && (
          <button className="loading-screen__retry" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="loading-screen__spinner" />
      <p className="loading-screen__text">{message}</p>
    </div>
  );
}
