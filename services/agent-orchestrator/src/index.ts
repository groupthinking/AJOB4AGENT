import express from 'express';
import dotenv from 'dotenv';
import stripeRoutes from './api/stripe.routes';
import webhookHandler from './api/webhook.handler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: The webhook handler must come BEFORE the default express.json() parser
// because it needs the raw request body.
app.use('/', webhookHandler);

app.use(express.json());

// All other routes
app.use('/api', stripeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Agent Orchestrator server running on port ${PORT}`);
});

export default app;