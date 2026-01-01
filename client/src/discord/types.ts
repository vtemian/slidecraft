/**
 * Discord user information returned after authentication.
 */
export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

/**
 * Authentication state for the Discord Activity.
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: DiscordUser | null;
  accessToken: string | null;
}

/**
 * Discord Activity context information.
 */
export interface ActivityContext {
  guildId: string | null;
  channelId: string | null;
  instanceId: string;
}
