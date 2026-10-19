const express = require('express');
const router = express.Router();
const { getInstructors, getInstructor, getAllUsers, updateUser, deleteUser, getLeaderboard } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/leaderboard', getLeaderboard);
router.get('/instructors', getInstructors);
router.get('/instructors/:id', getInstructor);
router.get('/all', protect, adminOnly, getAllUsers);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
