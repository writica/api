// Register module aliases using import-module-alias for ES Modules
import 'module-alias/register.js';

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import logger from './lib/logger.js';

// Initialize dotenv
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


// Routes (if needed for future expansion)
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`);
  logger.info(`URL: http://localhost:${PORT}/`);
});
