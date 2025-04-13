import express from 'express';

const router = express.Router();

// Simple route to indicate server is running
router.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Setup MCP routes
router.get('/mcp/sse', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write('event: connected\ndata: {"status":"connected"}\n\n');
  
  // Keep connection alive with ping every 30 seconds
  const pingInterval = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 30000);
  
  // Clean up on close
  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Add health check endpoint for MCP server
router.get('/mcp/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'MCP Server',
    version: '1.0.0'
  });
});

export default router;
