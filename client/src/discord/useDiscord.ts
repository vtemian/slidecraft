import { useContext } from 'react';
import { DiscordContext } from './DiscordProvider';

/**
 * Hook to access Discord SDK and authentication state.
 */
export function useDiscord() {
  const context = useContext(DiscordContext);
  if (!context) {
    throw new Error('useDiscord must be used within a DiscordProvider');
  }
  return context;
}
