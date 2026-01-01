import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import type { DiscordUser, AuthState, ActivityContext } from './types';

// Discord Application ID - will be set via environment variable
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';

// Detect if running inside Discord iframe
function isRunningInDiscord(): boolean {
  try {
    // Discord Activities run in an iframe with specific URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('frame_id') || urlParams.has('instance_id');
  } catch {
    return false;
  }
}

/**
 * Initialize the Discord SDK.
 * Returns a mock SDK when running outside Discord for development.
 */
export async function initializeDiscordSDK(): Promise<DiscordSDK | DiscordSDKMock> {
  if (!DISCORD_CLIENT_ID) {
    console.warn('VITE_DISCORD_CLIENT_ID not set, using mock SDK');
    return createMockSDK();
  }

  if (!isRunningInDiscord()) {
    console.log('Not running in Discord, using mock SDK for development');
    return createMockSDK();
  }

  const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
  await sdk.ready();
  return sdk;
}

/**
 * Create a mock SDK for development outside Discord.
 */
function createMockSDK(): DiscordSDKMock {
  return new DiscordSDKMock(DISCORD_CLIENT_ID, null, null, null);
}

/**
 * Authenticate with Discord and exchange code for token via our server.
 */
export async function authenticateWithDiscord(
  sdk: DiscordSDK | DiscordSDKMock
): Promise<AuthState> {
  try {
    // Request authorization from Discord
    const { code } = await sdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });

    // Exchange code for token via our server
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Token exchange failed');
    }

    const { accessToken, user } = await response.json();

    // Authenticate the SDK with the access token
    await sdk.commands.authenticate({ access_token: accessToken });

    return {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      user,
      accessToken,
    };
  } catch (error) {
    console.error('Discord authentication failed:', error);
    return {
      isAuthenticated: false,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      user: null,
      accessToken: null,
    };
  }
}

/**
 * Get Activity context (guild, channel, instance).
 */
export function getActivityContext(sdk: DiscordSDK | DiscordSDKMock): ActivityContext {
  return {
    guildId: sdk.guildId ?? null,
    channelId: sdk.channelId ?? null,
    instanceId: sdk.instanceId,
  };
}

/**
 * Mock authentication for development outside Discord.
 */
export function createMockAuthState(): AuthState {
  return {
    isAuthenticated: true,
    isLoading: false,
    error: null,
    user: {
      id: 'mock-user-123',
      username: 'DevUser',
      avatar: null,
      discriminator: '0',
      global_name: 'Development User',
    },
    accessToken: 'mock-token',
  };
}
