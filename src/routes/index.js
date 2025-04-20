import express from 'express';
import scoreController from '../controllers/score.js';

const router = express.Router();

// Simple route to indicate server is running
router.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Score routes
router.get('/getscore', scoreController.getScore);

export default router;
