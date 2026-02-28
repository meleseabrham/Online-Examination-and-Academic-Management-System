import express from 'express';
import { login, register, getProfile, changePassword, updateProfileImage } from '../controllers/authController.js';
import { getLatestAnnouncement } from '../controllers/announcementController.js';
import { getPublicSettings } from '../controllers/systemController.js';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';
import { profileUpload } from '../middleware/upload.js';
const router = express.Router();
router.post('/login', login);
router.post('/register', register);
router.get('/announcement/latest', optionalAuthenticateToken, getLatestAnnouncement);
router.get('/system-settings/public', getPublicSettings);
// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);
router.post('/profile-image', authenticateToken, profileUpload.single('profileImage'), updateProfileImage);
export default router;
