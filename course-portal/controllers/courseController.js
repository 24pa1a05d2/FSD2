const Course = require('../models/Course');
const User = require('../models/User');

// @GET /api/courses
const getCourses = async (req, res) => {
  try {
    const { search, department, category, semester, year, sort, page = 1, limit = 12 } = req.query;
    const query = { isActive: true };
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    if (department) query.department = department;
    if (category) query.category = category;
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);
    
    const sortOpts = { 
      'rating': { averageRating: -1 },
      'popular': { totalRatings: -1 },
      'newest': { createdAt: -1 },
      'title': { title: 1 }
    }[sort] || { averageRating: -1 };

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate('instructor', 'name department avatar')
      .sort(sortOpts)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, pages: Math.ceil(total / limit), page: parseInt(page), courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/courses/:id
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name department avatar bio email')
      .populate('enrolledStudents', 'name');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/courses
const createCourse = async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, instructor: req.user._id });
    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/courses/:id/enroll
const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.enrolledStudents.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }
    course.enrolledStudents.push(req.user._id);
    await course.save();
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { enrolledCourses: course._id } });
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/courses/stats/summary
const getStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const instructors = await User.countDocuments({ role: 'instructor' });
    const topRated = await Course.find({ isActive: true, totalRatings: { $gt: 0 } })
      .sort({ averageRating: -1 }).limit(5).populate('instructor', 'name');
    const departments = await Course.distinct('department');
    res.json({ success: true, stats: { totalCourses, totalUsers, students, instructors, topRated, departments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCourses, getCourse, createCourse, updateCourse, deleteCourse, enrollCourse, getStats };
