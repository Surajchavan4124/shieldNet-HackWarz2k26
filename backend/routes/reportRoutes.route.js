import express from 'express';
import { reportPost } from '../controllers/reportController.js';

const router = express.Router();

// @route   POST /api/report
// @desc    Report suspicious content
// @access  Public (from extension/app)
router.post('/', reportPost);

export default router;
