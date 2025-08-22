// ... imports
import stripeRoutes from './api/stripe.routes';
import webhookHandler from './api/webhook.handler';

// ... app setup

// IMPORTANT: The webhook handler must come BEFORE the default express.json() parser
// because it needs the raw request body.
app.use('/', webhookHandler); 

app.use(express.json());

// All other routes
app.use('/api', stripeRoutes);
// ... other routes like '/process-scraped-job'

// ...