import express from 'express';

const router = express.Router();

// Simple route to indicate server is running
router.get('/', (req, res) => {
  res.status(200).send('OK');
});


export default router;
