import { Request, Response, NextFunction } from 'express';
// In a real application, you would query the PostgreSQL database.
// We'll use a mock function for this example.
// You would replace this with a proper DB client like 'pg' or an ORM like 'Sequelize'.

// Mock User Type - In reality, this would match your DB schema.
interface User {
  id: number;
  plan: 'PILOT' | 'PRO' | 'ENTERPRISE';
  application_credits: number;
}

// MOCK DATABASE CALL - REPLACE WITH REAL IMPLEMENTATION
async function findUserById(userId: number): Promise<User | null> {
    // TODO: Connect to PostgreSQL and fetch user data.
    // Example: SELECT id, plan, application_credits FROM users WHERE id = $1
    const mockUsers: { [key: number]: User } = {
        1: { id: 1, plan: 'PILOT', application_credits: 2 }, // A free user with credits
        2: { id: 2, plan: 'PRO', application_credits: 99 },   // A pro user
        3: { id: 3, plan: 'PILOT', application_credits: 0 },  // A free user with no credits
    };
    return mockUsers[userId] || null;
}

export const subscriptionCheck = async (req: Request, res: Response, next: NextFunction) => {
    // CRITICAL PREREQUISITE: A real authentication middleware must run before this
    // to identify the user and attach their ID to the request object.
export const subscriptionCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // CRITICAL PREREQUISITE: A real authentication middleware must run before this
    // to identify the user and attach their ID to the request object.
    const userId = req.userId; 
    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized. No user identified.' });
    }

    const user = await findUserById(userId);

    if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    // Attach user to request for downstream use
    (req as any).user = user;

    if (user.plan === 'ENTERPRISE' || user.plan === 'PRO') {
        // PRO and ENTERPRISE have effectively unlimited applications for this check.
        // More granular checks could be added here.
        console.log(`[Auth] Access GRANTED for ${user.plan} user ${userId}.`);
        return next();
    }

    // Default to PILOT plan logic
    if (user.application_credits > 0) {
        console.log(`[Auth] Access GRANTED for PILOT user ${userId}. Credits remaining: ${user.application_credits}`);
        return next();
    } else {
        console.log(`[Auth] Access DENIED for PILOT user ${userId}. No credits remaining.`);
        return res.status(429).json({ // 429 Too Many Requests is appropriate
            status: 'error',
            message: 'You have used all your free application credits. Please upgrade to PRO to continue.',
        });
    }
};