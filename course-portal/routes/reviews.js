const express = require('express');
const router = express.Router();
const { getCourseReviews, createReview, updateReview, deleteReview, getMyReviews, getAllReviews } = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/my', protect, getMyReviews);
router.get('/all', protect, adminOnly, getAllReviews);
router.get('/course/:courseId', getCourseReviews);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
