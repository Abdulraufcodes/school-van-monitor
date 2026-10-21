import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
