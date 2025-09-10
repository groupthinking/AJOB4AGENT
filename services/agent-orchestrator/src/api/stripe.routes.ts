import { Request, Response, Router } from 'express';
import Stripe from 'stripe';

// This would be in a separate config file
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const router = Router();

// MOCK DATABASE CALL - REPLACE WITH REAL IMPLEMENTATION
async function updateUserStripeCustomerId(userId: number, customerId: string): Promise<void> {
    console.log(`[DB] Associating user ${userId} with Stripe customer ${customerId}`);
    // SQL: UPDATE users SET stripe_customer_id = $1 WHERE id = $2
}

router.post('/create-checkout-session', async (req: Request, res: Response) => {
    // A real auth middleware must place userId on the request object first
    const userId = (req as any).userId; 
    const { priceId } = req.body; // e.g., 'price_...' for the PRO plan

    if (!userId || !priceId) {
        return res.status(400).json({ error: 'Missing userId or priceId' });
    }

    try {
        // Create a Stripe customer for the user if one doesn't exist
        const customer = await stripe.customers.create({
            email: (req as any).user.email, // Assuming user email is on the request
            metadata: {
                userId: userId, // Our internal user ID
            },
        });

        // Save the customer ID to our database
        await updateUserStripeCustomerId(userId, customer.id);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: customer.id,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // IMPORTANT: We pass our internal user ID here to link the transaction back
            // client_reference_id: userId.toString(),
            success_url: `http://localhost:3001/dashboard?payment=success`, // Your frontend success URL
            cancel_url: `http://localhost:3001/dashboard?payment=cancelled`, // Your frontend cancellation URL
        });

        res.json({ sessionId: session.id });
    } catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
});

export default router;