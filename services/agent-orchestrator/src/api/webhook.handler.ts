import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const router = Router();

// MOCK DATABASE CALL - REPLACE WITH REAL IMPLEMENTATION
async function updateUserPlanAndCredits(userId: string, newPlan: 'PRO' | 'ENTERPRISE'): Promise<void> {
    const credits = newPlan === 'PRO' ? 100 : 9999; // Or some other large number for Enterprise
    console.log(`[DB] Upgrading user ${userId} to ${newPlan} with ${credits} credits.`);
    // SQL: UPDATE users SET plan = $1, application_credits = $2 WHERE id = $3
}


// Stripe requires the raw body to construct the event
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed.`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
            const userId = customer.metadata.userId;

            console.log(`Payment was successful for user ${userId}!`);
            
            // TODO: Fulfill the purchase.
            // Check session.line_items to see which plan was purchased
            // and update the user's plan and credits in your database.
            await updateUserPlanAndCredits(userId, 'PRO'); // Hardcoded to PRO for this example
            break;
        
        // ... handle other event types (e.g., 'invoice.payment_failed')
        
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

export default router;