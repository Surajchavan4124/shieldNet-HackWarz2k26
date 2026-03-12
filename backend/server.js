import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

import analyzeRoutes from './routes/analyzeRoutes.route.js';
import reportRoutes from './routes/reportRoutes.route.js';
import moderationRoutes from './routes/moderationRoutes.route.js';

// Connect to Database
if (process.env.MONGODB_URI) {
  connectDB();
} else {
  console.log('MongoDB connection skipped: Please set valid MONGODB_URI in .env');
}

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/moderation', moderationRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('ShieldNet API is running with new architecture...');
});

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
