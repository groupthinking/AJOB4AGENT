import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

// Get current user
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Get all users (admin only)
router.get('/', authenticate, authorize('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  // In production, fetch from database
  res.json({
    success: true,
    users: [],
    message: 'User listing not implemented in development mode',
  });
});

// Update user profile
router.patch('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { name } = req.body;
  
  // In production, update in database
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      ...req.user,
      name: name || undefined,
    },
  });
});

// Delete user account
router.delete('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  // In production, delete from database
  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});

// Update user role (admin only)
router.patch('/:userId/role', authenticate, authorize('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;
  const { role } = req.body;
  
  if (!['USER', 'PREMIUM', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  
  // In production, update in database
  res.json({
    success: true,
    message: `User ${userId} role updated to ${role}`,
  });
});

export default router;
