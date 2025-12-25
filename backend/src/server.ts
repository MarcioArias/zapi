import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import path from 'path';
import fs from 'fs';
import https from 'https';

import clientRoutes from './routes/clientRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import appRoutes from './routes/appRoutes';
import paymentRoutes from './routes/paymentRoutes';

import { whatsappService } from './services/whatsappService';
import { logger } from './config/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Desabilita CSP para permitir scripts inline no front
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/clients', clientRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/app', appRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Zapi Backend is running' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const APP_MODE = process.env.APP_MODE || 'desktop';

// Heartbeat / Auto-shutdown logic for Desktop Mode
let lastHeartbeat = Date.now();
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds without heartbeat = shutdown
const STARTUP_GRACE_PERIOD = 60000; // 60 seconds grace period at startup

app.post('/api/heartbeat', (req, res) => {
  lastHeartbeat = Date.now();
  res.status(200).send('OK');
});

if (APP_MODE === 'desktop') {
  // Grace period before starting checks
  setTimeout(() => {
    logger.info('❤️ Heartbeat Monitor Started');
    setInterval(() => {
      const timeSinceLastBeat = Date.now() - lastHeartbeat;
      if (timeSinceLastBeat > SHUTDOWN_TIMEOUT) {
        logger.info(`⚠️ No heartbeat for ${timeSinceLastBeat}ms. Shutting down to prevent zombie process...`);
        whatsappService.destroy().then(() => {
            process.exit(0);
        }).catch(() => process.exit(0));
      }
    }, 5000);
  }, STARTUP_GRACE_PERIOD);
}

// Start Server Logic (HTTP vs HTTPS)
const startServer = () => {
  const onListen = () => {
    logger.info(`Server running on port ${port} [MODE: ${APP_MODE.toUpperCase()}]`);
    
    // Only start WhatsApp engine if in DESKTOP mode
    if (APP_MODE === 'desktop') {
      whatsappService.restoreSessions();
    } else {
      logger.info('☁️ Cloud Mode: WhatsApp Engine disabled (Management Only)');
    }
  };

  if (APP_MODE === 'desktop') {
    // Desktop Mode uses local HTTPS certificates
    try {
      const privateKey = fs.readFileSync(path.join(__dirname, '../certs/server.key'), 'utf8');
      const certificate = fs.readFileSync(path.join(__dirname, '../certs/server.cert'), 'utf8');
      const credentials = { key: privateKey, cert: certificate };
      
      https.createServer(credentials, app).listen(port, onListen);
      logger.info('🔒 Starting in HTTPS mode (Desktop)');
    } catch (e) {
      logger.error('Failed to load SSL certs, falling back to HTTP:', e);
      app.listen(port, onListen);
    }
  } else {
    // Cloud Mode uses standard HTTP (SSL handled by proxy/Render)
    app.listen(port, onListen);
    logger.info('☁️ Starting in HTTP mode (Cloud/Proxy)');
  }
};

startServer();
