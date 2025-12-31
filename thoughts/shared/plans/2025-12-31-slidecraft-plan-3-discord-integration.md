# SlideCraft Implementation Plan 3: Discord Integration

**Goal:** Integrate the Discord Embedded App SDK to run SlideCraft as a Discord Activity with OAuth authentication.

**Architecture:** Client uses Discord Embedded App SDK to run inside Discord iframe. Server handles OAuth token exchange to protect client secret. User identity flows from Discord through server to client.

**Design:** [thoughts/shared/designs/2025-12-31-slidecraft-design.md](../designs/2025-12-31-slidecraft-design.md)

**Prerequisites:** Plan 1 (project setup) and Plan 2 (game logic) completed

**Done when:**
- Client initializes Discord SDK and requests authorization
- Server exchanges OAuth code for access token
- User identity is available in client
- Activity runs inside Discord (testable via Discord Developer Portal)
- Graceful fallback when running outside Discord

---

## Task 1: Add Discord SDK to Client

**Files:**
- Modify: `client/package.json`
- Create: `client/src/discord/sdk.ts`
- Create: `client/src/discord/types.ts`

**Step 1: Install Discord Embedded App SDK**

Add to `client/package.json` dependencies:

```json
{
  "dependencies": {
    "@discord/embedded-app-sdk": "^1.4.0"
  }
}
```

Run: `bun install`
Expected: Package installed

**Step 2: Create Discord types**

Create file `client/src/discord/types.ts`:

```typescript
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
```

**Step 3: Create Discord SDK wrapper**

Create file `client/src/discord/sdk.ts`:

```typescript
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
  return new DiscordSDKMock(DISCORD_CLIENT_ID, null, null);
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
```

**Step 4: Commit Discord SDK setup**

```bash
git add client/src/discord/ client/package.json
git commit -m "feat(client): add Discord Embedded App SDK wrapper"
```

---

## Task 2: Create Discord Context Provider

**Files:**
- Create: `client/src/discord/DiscordProvider.tsx`
- Create: `client/src/discord/useDiscord.ts`
- Create: `client/src/discord/index.ts`

**Step 1: Create Discord context and provider**

Create file `client/src/discord/DiscordProvider.tsx`:

```typescript
import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';
import type { AuthState, ActivityContext } from './types';
import {
  initializeDiscordSDK,
  authenticateWithDiscord,
  getActivityContext,
  createMockAuthState,
} from './sdk';

interface DiscordContextValue {
  sdk: DiscordSDK | DiscordSDKMock | null;
  auth: AuthState;
  context: ActivityContext | null;
  isReady: boolean;
}

export const DiscordContext = createContext<DiscordContextValue>({
  sdk: null,
  auth: {
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
    accessToken: null,
  },
  context: null,
  isReady: false,
});

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
```

**Step 2: Create useDiscord hook**

Create file `client/src/discord/useDiscord.ts`:

```typescript
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
```

**Step 3: Create index export**

Create file `client/src/discord/index.ts`:

```typescript
export { DiscordProvider, DiscordContext } from './DiscordProvider';
export { useDiscord } from './useDiscord';
export type { DiscordUser, AuthState, ActivityContext } from './types';
export {
  initializeDiscordSDK,
  authenticateWithDiscord,
  getActivityContext,
  createMockAuthState,
} from './sdk';
```

**Step 4: Commit Discord provider**

```bash
git add client/src/discord/
git commit -m "feat(client): add Discord context provider and useDiscord hook"
```

---

## Task 3: Add OAuth Token Exchange Endpoint to Server

**Files:**
- Create: `server/src/routes/auth.ts`
- Create: `server/src/routes/auth.test.ts`
- Modify: `server/src/index.ts`
- Create: `server/.env.example`

**Step 1: Create environment example file**

Create file `server/.env.example`:

```
# Discord Application Credentials
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Server Configuration
PORT=3001
```

**Step 2: Write failing test for token exchange**

Create file `server/src/routes/auth.test.ts`:

```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import express from 'express';
import authRouter from './auth';

describe('POST /api/auth/token', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  it('returns 400 if code is missing', async () => {
    const response = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing authorization code');
  });

  it('returns 400 if code is empty', async () => {
    const response = await app.request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing authorization code');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `bun test server/src/routes/auth.test.ts`
Expected: FAIL - module not found

**Step 4: Implement auth route**

Create file `server/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import type { TokenExchangeRequest, TokenExchangeResponse, ApiError } from '@slidecraft/shared';

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_API_URL = 'https://discord.com/api/v10';

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
```

**Step 5: Run tests**

Run: `bun test server/src/routes/auth.test.ts`
Expected: All tests pass

**Step 6: Add auth route to server**

Update `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 7: Commit auth endpoint**

```bash
git add server/
git commit -m "feat(server): add Discord OAuth token exchange endpoint"
```

---

## Task 4: Integrate Discord Provider into App

**Files:**
- Modify: `client/src/main.tsx`
- Modify: `client/src/App.tsx`
- Create: `client/src/components/LoadingScreen/LoadingScreen.tsx`
- Create: `client/src/components/LoadingScreen/LoadingScreen.css`
- Create: `client/src/components/LoadingScreen/index.ts`

**Step 1: Create LoadingScreen component**

Create file `client/src/components/LoadingScreen/LoadingScreen.css`:

```css
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.loading-screen__spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #4a4a6a;
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-screen__text {
  font-size: 1.2rem;
  opacity: 0.8;
}

.loading-screen__error {
  color: #ff4444;
  text-align: center;
  max-width: 300px;
}

.loading-screen__retry {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #4a4a6a;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.loading-screen__retry:hover {
  background: #5a5a7a;
}
```

Create file `client/src/components/LoadingScreen/LoadingScreen.tsx`:

```typescript
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
```

Create file `client/src/components/LoadingScreen/index.ts`:

```typescript
export { LoadingScreen } from './LoadingScreen';
```

**Step 2: Update main.tsx to include DiscordProvider**

Update `client/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DiscordProvider } from './discord';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DiscordProvider>
      <App />
    </DiscordProvider>
  </React.StrictMode>
);
```

**Step 3: Update App to use Discord context**

Update `client/src/App.tsx`:

```typescript
import type { Puzzle } from '@slidecraft/shared';
import { useDiscord } from './discord';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';

// Test puzzle for development
const testPuzzle: Puzzle = {
  id: 1,
  date: '2025-01-01',
  ships: [
    { color: 'red', position: { x: 2, y: 2 } },
    { color: 'blue', position: { x: 8, y: 5 } },
    { color: 'green', position: { x: 12, y: 10 } },
    { color: 'yellow', position: { x: 5, y: 14 } },
  ],
  obstacles: [
    { type: 'asteroid', position: { x: 5, y: 2 } },
    { type: 'asteroid', position: { x: 10, y: 8 } },
    { type: 'asteroid', position: { x: 3, y: 12 } },
    { type: 'forceField', position: { x: 7, y: 5 }, edge: 'right' },
    { type: 'forceField', position: { x: 14, y: 2 }, edge: 'down' },
  ],
  astronaut: { x: 14, y: 2 },
  optimalMoves: 3,
};

export default function App() {
  const { auth, isReady } = useDiscord();

  if (!isReady) {
    return <LoadingScreen message="Connecting to Discord..." />;
  }

  if (auth.error) {
    return (
      <LoadingScreen
        error={auth.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {auth.user && (
        <div style={{ padding: '0.5rem', textAlign: 'right', opacity: 0.7 }}>
          Playing as {auth.user.username}
        </div>
      )}
      <Game puzzle={testPuzzle} />
    </div>
  );
}
```

**Step 4: Update App test to handle Discord provider**

Update `client/src/App.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscordProvider } from './discord';
import App from './App';

const renderWithDiscord = (component: React.ReactElement) => {
  return render(
    <DiscordProvider skipInit>
      {component}
    </DiscordProvider>
  );
};

describe('App', () => {
  it('renders the game title', () => {
    renderWithDiscord(<App />);
    expect(screen.getByText(/SlideCraft #1/)).toBeInTheDocument();
  });

  it('shows move count', () => {
    renderWithDiscord(<App />);
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('shows optimal moves', () => {
    renderWithDiscord(<App />);
    expect(screen.getByText(/Optimal: 3/)).toBeInTheDocument();
  });

  it('renders reset button', () => {
    renderWithDiscord(<App />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows username when authenticated', () => {
    renderWithDiscord(<App />);
    expect(screen.getByText(/Playing as DevUser/)).toBeInTheDocument();
  });
});
```

**Step 5: Run tests**

Run: `bun run --cwd client test`
Expected: All tests pass

**Step 6: Commit Discord integration**

```bash
git add client/src/
git commit -m "feat(client): integrate Discord provider with App"
```

---

## Task 5: Create Environment Configuration

**Files:**
- Create: `client/.env.example`
- Modify: `client/vite.config.ts`

**Step 1: Create client environment example**

Create file `client/.env.example`:

```
# Discord Application ID (public, safe for client)
VITE_DISCORD_CLIENT_ID=your_client_id_here

# API URL (for production)
VITE_API_URL=http://localhost:3001
```

**Step 2: Update vite.config.ts for environment variables**

Update `client/vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    // Required for Discord Activity iframe
    build: {
      target: 'esnext',
    },
  };
});
```

**Step 3: Commit environment configuration**

```bash
git add client/.env.example client/vite.config.ts server/.env.example
git commit -m "chore: add environment configuration examples"
```

---

## Task 6: Add Discord Activity URL Mapping

**Files:**
- Create: `server/src/middleware/activityProxy.ts`
- Modify: `server/src/index.ts`

**Step 1: Create activity proxy middleware**

Discord Activities require URL mapping for the iframe. Create file `server/src/middleware/activityProxy.ts`:

```typescript
import { Router } from 'express';
import path from 'path';

const router = Router();

/**
 * Discord Activity URL mapping.
 * Maps /.proxy/* URLs to the actual API endpoints.
 * This is required because Discord Activities run in an iframe
 * and need special URL handling.
 */
router.use('/.proxy', (req, res, next) => {
  // Rewrite the URL to remove /.proxy prefix
  req.url = req.url.replace(/^\/.proxy/, '');
  next();
});

export default router;
```

**Step 2: Update server to use proxy middleware**

Update `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for Discord Activity
  credentials: true,
}));
app.use(express.json());

// Discord Activity URL mapping (/.proxy/* -> /*)
app.use('/.proxy', (req, _res, next) => {
  req.url = req.originalUrl.replace(/^\/.proxy/, '');
  next('route');
});

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 3: Commit proxy middleware**

```bash
git add server/src/
git commit -m "feat(server): add Discord Activity URL proxy support"
```

---

## Task 7: Document Discord Developer Portal Setup

**Files:**
- Create: `docs/discord-setup.md`

**Step 1: Create Discord setup documentation**

Create file `docs/discord-setup.md`:

```markdown
# Discord Developer Portal Setup

This guide walks through setting up SlideCraft as a Discord Activity.

## 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "SlideCraft" and create

## 2. Configure OAuth2

1. Go to OAuth2 > General
2. Add Redirect URLs:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Copy the **Client ID** and **Client Secret**

## 3. Enable Activities

1. Go to Activities > Getting Started
2. Enable "Activities"
3. Set the following URL Mappings:

| Prefix | Target |
|--------|--------|
| `/` | `http://localhost:3000` (dev) or your production URL |
| `/api` | `http://localhost:3001/api` (dev) or your production API URL |

## 4. Configure Environment Variables

### Client (.env)
```
VITE_DISCORD_CLIENT_ID=your_client_id
```

### Server (.env)
```
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

## 5. Test the Activity

### Development Testing

1. Start the dev servers: `bun run dev`
2. In Discord Developer Portal, go to Activities
3. Click "Test in Discord"
4. The Activity should launch in Discord

### Local Testing Without Discord

The app automatically uses a mock Discord SDK when:
- Running outside Discord iframe
- `VITE_DISCORD_CLIENT_ID` is not set

This allows normal development and testing without Discord.

## 6. Invite to Server

To test with others:
1. Go to OAuth2 > URL Generator
2. Select scopes: `applications.commands`
3. Copy the generated URL
4. Open in browser and add to your server

## Troubleshooting

### "Client ID not set" warning
Set `VITE_DISCORD_CLIENT_ID` in `client/.env`

### OAuth errors
- Verify redirect URLs match exactly
- Check client secret is correct
- Ensure scopes include `identify` and `guilds`

### Activity not loading
- Check URL mappings in Developer Portal
- Verify both client and server are running
- Check browser console for errors
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: add Discord Developer Portal setup guide"
```

---

## Summary

After completing this plan, you will have:

1. Discord Embedded App SDK integrated into the client
2. OAuth token exchange endpoint on the server
3. Discord context provider with authentication state
4. Mock SDK for development outside Discord
5. Loading and error screens for auth flow
6. URL proxy support for Discord Activity iframe
7. Environment configuration for Discord credentials
8. Documentation for Discord Developer Portal setup

The app can now:
- Run as a Discord Activity inside Discord
- Authenticate users via Discord OAuth
- Fall back to mock authentication for local development
- Display the authenticated user's name

Ready for Plan 4: Server API & Database.
