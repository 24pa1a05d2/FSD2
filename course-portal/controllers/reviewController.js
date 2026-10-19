const Review = require('../models/Review');
const Course = require('../models/Course');

// @GET /api/reviews/course/:courseId
const getCourseReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    const sortOpts = sort === 'highest' ? { rating: -1 } : sort === 'lowest' ? { rating: 1 } : { createdAt: -1 };
    const reviews = await Review.find({ course: req.params.courseId, isApproved: true })
      .populate('student', 'name avatar department')
      .sort(sortOpts)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Review.countDocuments({ course: req.params.courseId, isApproved: true });

    // Rating distribution
    const distribution = await Review.aggregate([
      { $match: { course: require('mongoose').Types.ObjectId.createFromHexString(req.params.courseId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.json({ success: true, total, pages: Math.ceil(total / limit), reviews, distribution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/reviews
const createReview = async (req, res) => {
  try {
    const { course, rating, contentQuality, instructorClarity, courseMaterial, assessment, title, comment, pros, cons, isAnonymous, semester, year } = req.body;
    
    // Check enrollment
    const courseDoc = await Course.findById(course);
    if (!courseDoc) return res.status(404).json({ success: false, message: 'Course not found' });
    
    const existing = await Review.findOne({ course, student: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this course' });

    const review = await Review.create({
      course, student: req.user._id,
      rating, contentQuality, instructorClarity, courseMaterial, assessment,
      title, comment, pros, cons, isAnonymous, semester, year
    });
    
    await review.populate('student', 'name avatar department');
    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Already reviewed this course' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/reviews/:id
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Review.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true });
    res.json({ success: true, review: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/reviews/my
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ student: req.user._id })
      .populate('course', 'title code averageRating thumbnail instructor')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/reviews/all (admin)
const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Review.countDocuments();
    const reviews = await Review.find()
      .populate('course', 'title code')
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, total, pages: Math.ceil(total / limit), reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCourseReviews, createReview, updateReview, deleteReview, getMyReviews, getAllReviews };
