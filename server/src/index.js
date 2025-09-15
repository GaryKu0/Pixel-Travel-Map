import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { initializeDatabase, getDb } from './database.js';
import authRouter from './routes/auth.js';
import mapsRouter from './routes/maps.js';
import memoriesRouter from './routes/memories.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize database
await initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/memories', memoriesRouter);

// Serve static files from the built frontend
app.use(express.static(join(__dirname, '../../dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint (prevent 404 errors from third-party scripts)
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Test endpoint working' });
});

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});