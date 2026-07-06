import express from 'express';
const router = express.Router();

import leadAddController from '../Controllers/LeadAddController.js';
import handleTaskCommentAdd from '../Controllers/TaskCommentAddController.js';
import leadChangeController from '../Controllers/leadChangeController.js';

router.post('/lead/add', leadAddController);
router.post('/task/comment/add', handleTaskCommentAdd);
router.post('/lead/change', leadChangeController);

// Export the router using ESM syntax
export default router;