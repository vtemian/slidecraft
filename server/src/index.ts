import express, { type Express } from 'express';
import cors from 'cors';
import path from 'path';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import puzzleRouter from './routes/puzzle.js';
import solutionRouter from './routes/solution.js';
import statsRouter from './routes/stats.js';
import { runMigrations } from './db/migrate.js';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Discord Activity URL mapping
app.use('/.proxy', (req, _res, next) => {
  req.url = req.originalUrl.replace(/^\/.proxy/, '');
  next('route');
});

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/puzzle', puzzleRouter);
app.use('/api/solution', solutionRouter);
app.use('/api/stats', statsRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Initialize database and start server
async function start() {
  try {
    // Run migrations
    await runMigrations();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
