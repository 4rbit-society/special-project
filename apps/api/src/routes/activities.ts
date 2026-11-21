import { Router } from 'express';
import { createActivitySchema } from '@starter/shared';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import { createActivity, listActivities } from '../db/feature-data.js';

export function activitiesRouter(users: UserRepository): Router {
  const router = Router();
  router.use(requireAuth(users));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(await listActivities(currentUser(req).id));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = parse(createActivitySchema, req.body);
      res.status(201).json(await createActivity(currentUser(req).id, input));
    }),
  );

  return router;
}
