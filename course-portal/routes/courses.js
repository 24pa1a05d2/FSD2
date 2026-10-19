const express = require('express');
const router = express.Router();
const { getCourses, getCourse, createCourse, updateCourse, deleteCourse, enrollCourse, getStats } = require('../controllers/courseController');
const { protect, instructorOrAdmin, adminOnly } = require('../middleware/auth');

router.get('/stats/summary', getStats);
router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', protect, instructorOrAdmin, createCourse);
router.put('/:id', protect, instructorOrAdmin, updateCourse);
router.delete('/:id', protect, adminOnly, deleteCourse);
router.post('/:id/enroll', protect, enrollCourse);

module.exports = router;
