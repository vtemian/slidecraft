---
date: 2025-12-31
topic: "SlideCraft - Daily Sliding Puzzle Discord Activity"
status: validated
---

# SlideCraft Design Document

## Problem Statement

We want to build a daily puzzle game inspired by Ricochet Robots, playable as a Discord Activity. The game should create a shared social experience where players solve the same puzzle each day and compare results - similar to how Wordle creates daily conversation and friendly competition.

## Constraints

- **Discord Activity:** Must run as an embedded app inside Discord via their SDK
- **Cross-platform:** Works on Discord desktop, web, and mobile clients
- **Daily cadence:** One puzzle per day, same for all players globally
- **Session length:** Quick play sessions (3-5 minutes typical)
- **Accessibility:** Colorblind-friendly with shape differentiation

## Approach

Build a Ricochet Robots-style sliding puzzle with a space rescue theme. Players navigate spaceships that slide until they hit obstacles, trying to get the rescue ship to a stranded astronaut in as few moves as possible.

The Wordle model provides the social framework: daily puzzle, spoiler-free sharing, streak tracking. The Ricochet Robots mechanics provide the puzzle depth: multi-piece coordination, obstacle navigation, optimal path finding.

## Architecture

### High-Level Structure

```
slidecraft/
  client/           # React app (Discord Activity iframe)
  server/           # Express API (OAuth, puzzles, stats)
  shared/           # TypeScript types shared between client/server
```

**Monorepo** with shared types ensures client and server stay in sync on data structures.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Client Framework | React + TypeScript |
| Build Tool | Vite |
| Animations | Framer Motion |
| Rendering | HTML/CSS (SVG for game pieces) |
| Server Framework | Express + TypeScript |
| Database | PostgreSQL |
| Discord Integration | Embedded App SDK |
| Auth | Discord OAuth2 |

## Components

### Client Components

**Game Board**
- 16x16 grid rendered as HTML elements
- Displays ships, asteroids, force fields, astronaut
- Handles viewport scaling for different screen sizes

**Ship Pieces**
- 4 ships: Red, Blue, Green, Yellow
- Each color has distinct silhouette (accessibility)
- Selected state shows available move directions
- Animated movement via Framer Motion

**Obstacles**
- Asteroids: Block entire cells (ships cannot enter)
- Force fields: Block cell edges (ships stop at edge)
- Visual distinction between the two types

**Controls**
- Desktop: Click ship to select, arrow keys to move
- Mobile: Tap ship to select, direction buttons to move
- Reset button (restarts puzzle, timer keeps running)

**Results Screen**
- Appears after celebration animation
- Shows: moves (yours vs optimal), time, star rating
- Stats: games played, win %, current streak, max streak
- Share button (copies formatted result to clipboard)
- History/distribution visualization

**Timer Display**
- Starts immediately on puzzle load
- Keeps running through resets
- Stops on successful solution

### Server Components

**Discord OAuth Handler**
- Exchanges authorization code for access token
- Server-side to protect client secret
- Returns user identity to client

**Puzzle API**
- GET today's puzzle (board layout, ship positions, astronaut, optimal move count)
- Puzzle keyed by date (UTC)

**Solution API**
- POST solution (validates, records moves + time)
- Returns updated player stats

**Stats API**
- GET player stats (streak, history, win %)
- Linked to Discord user ID

**Puzzle Generator**
- Generates valid puzzle configurations
- Solver algorithm determines optimal move count
- Auto-validates: solvable, difficulty in acceptable range
- Queues puzzles for future dates

### Database Schema (Conceptual)

**puzzles**
- id, date (unique), board_layout, ship_positions, astronaut_position, optimal_moves

**players**
- id, discord_user_id, games_played, games_won, current_streak, max_streak

**solutions**
- id, player_id, puzzle_id, moves, time_seconds, solved_at

## Data Flow

### Game Start
1. Discord launches Activity in iframe
2. Client initializes Discord SDK, requests OAuth authorization
3. Server exchanges code for token, returns user identity
4. Client fetches today's puzzle from server
5. Timer starts, game begins

### Gameplay
1. Player selects ship (click/tap)
2. Player chooses direction (arrow key/button)
3. Client calculates ship destination (slides until obstacle)
4. Framer Motion animates ship movement
5. Client updates game state, increments move count
6. If rescue ship reaches astronaut: trigger win

### Puzzle Completion
1. Win detected (rescue ship on astronaut)
2. Brief celebration animation plays
3. Client sends solution to server (moves, time)
4. Server validates, updates player stats
5. Server returns updated stats
6. Client displays results screen

### Sharing
1. Player clicks share button
2. Client formats result (puzzle #, moves/optimal, stars, time)
3. Copies to clipboard
4. Player pastes in Discord chat

### Daily Reset
1. UTC midnight triggers new puzzle
2. If player has Activity open, prompt to refresh
3. New puzzle fetched, fresh game state

## Error Handling

**Network Failures**
- Retry with exponential backoff for API calls
- Cache puzzle locally once fetched (survives brief disconnects)
- Queue solution submission if offline, retry when reconnected

**Invalid Game State**
- Server validates solutions against puzzle
- Reject impossible solutions (ship positions that can't be reached)
- Client-side validation as first pass

**Discord SDK Errors**
- Graceful degradation if SDK features unavailable
- Clear error messages if OAuth fails

**Puzzle Generation Failures**
- Generator retries if puzzle unsolvable or wrong difficulty
- Alert system if puzzle queue runs low

## Testing Strategy

### Unit Tests
- Puzzle solver: verify optimal move calculation
- Movement logic: ship slides correctly, stops at obstacles
- Validation: solution checker accepts valid, rejects invalid

### Integration Tests
- OAuth flow: code exchange works end-to-end
- Puzzle API: returns correct puzzle for date
- Solution submission: stats update correctly

### E2E Tests
- Full game flow: load puzzle, make moves, complete, see results
- Sharing: format is correct, copies to clipboard

### Manual Testing
- Discord Activity in actual Discord client (desktop, web, mobile)
- Various screen sizes and orientations
- Colorblind mode verification

## Open Questions

None - design is validated and ready for implementation planning.

---

## Appendix: Sharing Format

```
SlideCraft #42
Moves: 7/5
Time: 2:34
```

**Star Rating Scale (TBD during implementation):**
- 5 stars: Optimal solution
- 4 stars: Optimal + 1
- 3 stars: Optimal + 2-3
- 2 stars: Optimal + 4-5
- 1 star: Solved but 6+ over optimal

## Appendix: Movement Rules

1. Ships move in 4 cardinal directions only (up, down, left, right)
2. A ship slides in the chosen direction until it hits:
   - Board edge
   - Asteroid (stops before entering asteroid cell)
   - Force field (stops at the field edge)
   - Another ship (stops adjacent to it)
3. All 4 ships can be moved, not just the rescue ship
4. Other ships often serve as obstacles to create the rescue path
5. Each slide = 1 move, regardless of distance traveled
