import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './db/init.js';
import { authRouter } from './routes/auth.js';
import { dogsRouter } from './routes/dogs.js';
import { foodRouter } from './routes/food.js';
import { vaccinationsRouter } from './routes/vaccinations.js';
import { eventsRouter } from './routes/events.js';
import { toysRouter } from './routes/toys.js';
import { healthRouter } from './routes/health.js';
import { aiRouter } from './routes/ai.js';
import { initScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dogs', dogsRouter);
app.use('/api/food', foodRouter);
app.use('/api/vaccinations', vaccinationsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/toys', toysRouter);
app.use('/api/health', healthRouter);
app.use('/api/ai', aiRouter);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'PawCare Hub API is running' });
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    initScheduler();
    console.log('Reminder scheduler initialized');

    app.listen(PORT, () => {
      console.log(`PawCare Hub server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
