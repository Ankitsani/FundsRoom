import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { login, me } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, me as any);

export default router;
