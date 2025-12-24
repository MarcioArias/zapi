import { Router } from 'express';
import { getInstances, createInstance, updateInstance, deleteInstance, sendMessage } from '../controllers/appController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply Auth Middleware to all App Routes
router.use(authMiddleware);

// Routes for the User App (Operational Area)
router.get('/instances', getInstances);
router.post('/instances', createInstance);
router.put('/instances/:id', updateInstance);
router.delete('/instances/:id', deleteInstance);

// Sending Endpoint (Stateless, logs are kept on client)
router.post('/send-message', sendMessage);

export default router;
