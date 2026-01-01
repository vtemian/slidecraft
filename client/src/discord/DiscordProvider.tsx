import { createContext, useEffect, useState, type ReactNode } from 'react';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import type { AuthState, ActivityContext } from './types';
import {
  initializeDiscordSDK,
  authenticateWithDiscord,
  getActivityContext,
  createMockAuthState,
} from './sdk';

export interface DiscordContextValue {
  sdk: DiscordSDK | DiscordSDKMock | null;
  auth: AuthState;
  context: ActivityContext | null;
  isReady: boolean;
}

export const DiscordContext = createContext<DiscordContextValue | null>(null);

interface DiscordProviderProps {
  children: ReactNode;
  /**
   * Skip Discord initialization (useful for testing).
   */
  skipInit?: boolean;
}

export function DiscordProvider({ children, skipInit = false }: DiscordProviderProps) {
  const [sdk, setSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
    accessToken: null,
  });
  const [context, setContext] = useState<ActivityContext | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (skipInit) {
      // Use mock auth for testing/development
      setAuth(createMockAuthState());
      setIsReady(true);
      return;
    }

    async function init() {
      try {
        // Initialize SDK
        const discordSdk = await initializeDiscordSDK();
        setSdk(discordSdk);

        // Get activity context
        const activityContext = getActivityContext(discordSdk);
        setContext(activityContext);

        // Check if we're using mock SDK (development mode)
        if (discordSdk instanceof DiscordSDKMock) {
          setAuth(createMockAuthState());
          setIsReady(true);
          return;
        }

        // Authenticate with Discord
        const authState = await authenticateWithDiscord(discordSdk);
        setAuth(authState);
        setIsReady(true);
      } catch (error) {
        console.error('Discord initialization failed:', error);
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Initialization failed',
          user: null,
          accessToken: null,
        });
        setIsReady(true);
      }
    }

    init();
  }, [skipInit]);

  return (
    <DiscordContext.Provider value={{ sdk, auth, context, isReady }}>
      {children}
    </DiscordContext.Provider>
  );
}
