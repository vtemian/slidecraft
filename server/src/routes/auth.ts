import { Router, type Router as RouterType } from 'express';
import type { TokenExchangeRequest, TokenExchangeResponse, ApiError } from '@slidecraft/shared';

const router: RouterType = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_API_URL = 'https://discord.com/api/v10';
const REDIRECT_URI = process.env.REDIRECT_URI || '';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

/**
 * Exchange Discord authorization code for access token.
 * This endpoint protects the client secret by handling the exchange server-side.
 */
router.post('/token', async (req, res) => {
  const { code } = req.body as TokenExchangeRequest;

  if (!code) {
    const error: ApiError = {
      error: 'Missing authorization code',
      message: 'The authorization code is required',
    };
    return res.status(400).json(error);
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error('Discord credentials not configured');
    const error: ApiError = {
      error: 'Server configuration error',
      message: 'Discord credentials are not configured',
    };
    return res.status(500).json(error);
  }

  try {
    // Exchange code for token with Discord
    const tokenResponse = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorData);
      const error: ApiError = {
        error: 'Token exchange failed',
        message: 'Failed to exchange authorization code for token',
      };
      return res.status(401).json(error);
    }

    const tokenData: DiscordTokenResponse = await tokenResponse.json();

    // Fetch user information
    const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user');
      const error: ApiError = {
        error: 'User fetch failed',
        message: 'Failed to fetch user information from Discord',
      };
      return res.status(401).json(error);
    }

    const userData: DiscordUserResponse = await userResponse.json();

    const response: TokenExchangeResponse = {
      accessToken: tokenData.access_token,
      user: {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Auth error:', error);
    const apiError: ApiError = {
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(apiError);
  }
});

export default router;
