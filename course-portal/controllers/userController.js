const User = require('../models/User');
const Course = require('../models/Course');
const Review = require('../models/Review');

// @GET /api/users/instructors
const getInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: 'instructor' }).select('-password');
    // Attach course count and avg rating per instructor
    const data = await Promise.all(instructors.map(async (inst) => {
      const courses = await Course.find({ instructor: inst._id, isActive: true });
      const avgRating = courses.reduce((a, c) => a + c.averageRating, 0) / (courses.length || 1);
      return { ...inst.toObject(), courseCount: courses.length, avgRating: Math.round(avgRating * 10) / 10 };
    }));
    res.json({ success: true, instructors: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/instructors/:id
const getInstructor = async (req, res) => {
  try {
    const instructor = await User.findById(req.params.id).select('-password');
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }
    const courses = await Course.find({ instructor: instructor._id, isActive: true });
    const reviews = await Review.find({ course: { $in: courses.map(c => c._id) } })
      .populate('student', 'name')
      .populate('course', 'title code')
      .sort({ createdAt: -1 }).limit(10);
    
    const avgRating = courses.reduce((a, c) => a + c.averageRating, 0) / (courses.length || 1);
    const totalStudents = courses.reduce((a, c) => a + c.enrolledStudents.length, 0);
    
    res.json({ success: true, instructor, courses, reviews, stats: { avgRating: Math.round(avgRating * 10) / 10, totalStudents, totalCourses: courses.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/all (admin)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = role ? { role } : {};
    const total = await User.countDocuments(query);
    const users = await User.find(query).select('-password')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, total, pages: Math.ceil(total / limit), users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/users/:id (admin)
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/users/:id (admin)
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/users/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const topCourses = await Course.find({ isActive: true, totalRatings: { $gt: 0 } })
      .sort({ averageRating: -1, totalRatings: -1 })
      .limit(10)
      .populate('instructor', 'name department');
    res.json({ success: true, leaderboard: topCourses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInstructors, getInstructor, getAllUsers, updateUser, deleteUser, getLeaderboard };
