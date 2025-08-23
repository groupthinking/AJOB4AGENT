import { Request, Response, Router } from 'express';

interface AuthedRequest extends Request {
    userId?: string;
    user?: {
        email: string;
    };
}

const router = Router();

// MOCK DATABASE CALL - REPLACE WITH REAL IMPLEMENTATION
async function updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    console.log(`[DB] Associating user ${userId} with Stripe customer ${customerId}`);
    // SQL: UPDATE users SET stripe_customer_id = $1 WHERE id = $2
}

router.post('/create-checkout-session', async (req: AuthedRequest, res: Response) => {
    // A real auth middleware must place userId on the request object first
    const userId = req.userId;
    const { priceId } = req.body; // e.g., 'price_...' for the PRO plan

    // Validate that user and user.email exist on the request object
    const user = req.user;
    if (!user || !user.email) {
        return res.status(400).json({ error: 'Missing user email on request' });
    }

    if (!userId || !priceId) {
        return res.status(400).json({ error: 'Missing userId or priceId' });
    }

    try {
        // Mock Stripe customer creation
        const customer = {
            id: `cus_mock_${Date.now()}`,
            email: user.email,
            metadata: {
                userId: userId,
            },
        };

        // Save the customer ID to our database
        await updateUserStripeCustomerId(userId, customer.id);

        // Mock session creation
        const session = {
            id: `cs_mock_${Date.now()}`,
            url: `http://localhost:3001/dashboard?payment=success`
        };

        res.json({ sessionId: session.id });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
});

export default router;