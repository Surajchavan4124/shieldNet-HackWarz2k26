import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
if (process.env.MONGO_URI && process.env.MONGO_URI !== 'your_mongodb_atlas_connection_string_here') {
  connectDB();
} else {
  console.log('MongoDB connection skipped: Please set valid MONGO_URI in .env');
}

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
