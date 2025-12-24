import { Router } from 'express';
import { loginClient, completeFirstAccess } from '../controllers/authController';

const router = Router();

router.post('/login', loginClient);
router.post('/first-access', completeFirstAccess);

export default router;
