import { Router, Request, Response } from 'express';

const router = Router();

type SSEClient = {
  id: string;
  res: Response;
};

let clients: SSEClient[] = [];

/**
 * Broadcasts an event to all connected clients over SSE.
 */
export function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch (err) {
      // client may have disconnected
    }
  }
}

// GET /api/v1/events
router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newClient: SSEClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat every 20 seconds to keep connection alive
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    clients = clients.filter(c => c.id !== clientId);
  });
});

export default router;
