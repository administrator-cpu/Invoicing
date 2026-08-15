import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import basicAuth from 'express-basic-auth';
import emailQueue from '../queues/emailQueue.js';
import logger from '../utils/logger.js';

export const setupBullBoard = (app) => {
  // 1. Initialize the Express Adapter
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // 2. Attach your queues
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter: serverAdapter,
  });

  // 3. Create the Security Checkpoint
  const authMiddleware = basicAuth({
    users: {
      // NEVER hardcode this in production. Always use env variables.
      [process.env.QUEUE_ADMIN_USER || 'admin']: process.env.QUEUE_ADMIN_PASSWORD || 'supersecret'
    },
    challenge: true,
    unauthorizedResponse: 'Access Denied: Invalid Credentials'
  });

  // 4. Mount the dashboard WITH the security middleware
  app.use('/admin/queues', authMiddleware, serverAdapter.getRouter());

  logger.info('Bull-Board mounted at /admin/queues (Protected by Basic Auth)');
};