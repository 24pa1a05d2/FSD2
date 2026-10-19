const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Config ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course_portal';
const JWT_SECRET = process.env.JWT_SECRET || 'course_portal_super_secret_key_2024';
process.env.JWT_SECRET = JWT_SECRET;

// ─── DB Status Flag ───────────────────────────────────────────
let isDbConnected = false;

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));

// ─── DB Status endpoint ───────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    dbConnected: isDbConnected,
    dbState: mongoose.connection.readyState,  // 0=disconnected,1=connected,2=connecting,3=disconnecting
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ─── Analytics Endpoint ───────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  if (!isDbConnected) {
    return res.json({ success: false, demo: true, message: 'Database not connected — showing demo data' });
  }
  try {
    const Course = require('./models/Course');
    const User = require('./models/User');
    const Review = require('./models/Review');

    // 1. Ratings distribution (1-5 star counts across ALL reviews)
    const ratingDist = await Review.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 2. Average rating per department (for bar chart comparison)
    const deptRatings = await Course.aggregate([
      { $match: { isActive: true, totalRatings: { $gt: 0 } } },
      { $group: { _id: '$department', avgRating: { $avg: '$averageRating' }, courseCount: { $sum: 1 }, totalReviews: { $sum: '$totalRatings' } } },
      { $sort: { avgRating: -1 } }
    ]);

    // 3. Category distribution (pie chart — how many courses per category)
    const categoryDist = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 4. Reviews per month (line chart — last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const reviewsOverTime = await Review.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Top instructors by avg rating
    const topInstructors = await User.aggregate([
      { $match: { role: 'instructor' } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: 'instructor', as: 'courses' } },
      { $project: {
        name: 1, department: 1,
        courseCount: { $size: '$courses' },
        avgRating: { $avg: '$courses.averageRating' },
        totalStudents: { $sum: '$courses.enrolledStudents' }
      }},
      { $match: { courseCount: { $gt: 0 } } },
      { $sort: { avgRating: -1 } },
      { $limit: 5 }
    ]);

    // 6. Sub-rating averages (spider/radar data)
    const subRatings = await Review.aggregate([
      { $group: {
        _id: null,
        avgContent: { $avg: '$contentQuality' },
        avgClarity: { $avg: '$instructorClarity' },
        avgMaterial: { $avg: '$courseMaterial' },
        avgAssessment: { $avg: '$assessment' },
        avgOverall: { $avg: '$rating' }
      }}
    ]);

    // 7. Role distribution (pie chart)
    const roleDist = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // 8. Semester comparison
    const semesterStats = await Review.aggregate([
      { $group: { _id: '$semester', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      demo: false,
      analytics: {
        ratingDist,
        deptRatings,
        categoryDist,
        reviewsOverTime,
        topInstructors,
        subRatings: subRatings[0] || {},
        roleDist,
        semesterStats
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Seed Demo Data ───────────────────────────────────────────
app.post('/api/seed', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, message: 'Database not connected. Please start MongoDB first.' });
  }
  try {
    const User = require('./models/User');
    const Course = require('./models/Course');
    const Review = require('./models/Review');

    await Review.deleteMany({});
    await Course.deleteMany({});
    await User.deleteMany({});

    // Create users
    const adminUser = await User.create({
      name: 'Dr. Admin', email: 'admin@university.edu', password: 'admin123',
      role: 'admin', department: 'Administration',
      bio: 'University portal administrator managing course ratings and feedback.'
    });

    const instructors = await User.create([
      { name: 'Prof. Sarah Mitchell', email: 'sarah@university.edu', password: 'inst123', role: 'instructor', department: 'Computer Science', bio: 'Expert in Machine Learning and AI with 15 years of teaching experience.' },
      { name: 'Dr. James Patel', email: 'james@university.edu', password: 'inst123', role: 'instructor', department: 'Mathematics', bio: 'PhD in Applied Mathematics, specialist in Data Analysis and Statistics.' },
      { name: 'Prof. Emily Chen', email: 'emily@university.edu', password: 'inst123', role: 'instructor', department: 'Engineering', bio: 'Software Engineer turned educator, teaching Web Technologies for 10+ years.' },
      { name: 'Dr. Robert Kim', email: 'robert@university.edu', password: 'inst123', role: 'instructor', department: 'Business', bio: 'MBA graduate with expertise in Project Management and Business Analytics.' }
    ]);

    const students = await User.create([
      { name: 'Alex Johnson', email: 'alex@student.edu', password: 'student123', role: 'student', department: 'Computer Science' },
      { name: 'Maya Williams', email: 'maya@student.edu', password: 'student123', role: 'student', department: 'Mathematics' },
      { name: 'Sam Davis', email: 'sam@student.edu', password: 'student123', role: 'student', department: 'Engineering' },
      { name: 'Priya Sharma', email: 'priya@student.edu', password: 'student123', role: 'student', department: 'Business' },
      { name: 'Chris Lee', email: 'chris@student.edu', password: 'student123', role: 'student', department: 'Computer Science' }
    ]);

    // Create courses
    const courses = await Course.create([
      { title: 'Machine Learning Fundamentals', code: 'CS501', description: 'Comprehensive introduction to ML algorithms, neural networks, and practical applications using Python and scikit-learn.', department: 'Computer Science', instructor: instructors[0]._id, credits: 4, semester: 'Fall', year: 2024, category: 'Engineering', tags: ['ML', 'Python', 'AI'], enrolledStudents: [students[0]._id, students[1]._id, students[2]._id] },
      { title: 'Advanced Calculus & Analysis', code: 'MATH401', description: 'Rigorous treatment of real analysis, multivariable calculus, and differential equations for science and engineering students.', department: 'Mathematics', instructor: instructors[1]._id, credits: 3, semester: 'Spring', year: 2024, category: 'Mathematics', tags: ['Calculus', 'Analysis', 'Mathematics'] },
      { title: 'Full Stack Web Development', code: 'CS305', description: 'Modern web development with React, Node.js, and MongoDB. Build production-ready applications from scratch.', department: 'Computer Science', instructor: instructors[2]._id, credits: 4, semester: 'Fall', year: 2024, category: 'Engineering', tags: ['React', 'Node.js', 'MongoDB', 'JavaScript'], enrolledStudents: [students[0]._id, students[4]._id] },
      { title: 'Business Analytics & Strategy', code: 'BUS301', description: 'Data-driven decision making, KPI analysis, and business intelligence tools for modern managers.', department: 'Business', instructor: instructors[3]._id, credits: 3, semester: 'Spring', year: 2024, category: 'Business', tags: ['Analytics', 'Strategy', 'Business Intelligence'] },
      { title: 'Data Structures & Algorithms', code: 'CS201', description: 'Essential CS fundamentals: arrays, trees, graphs, sorting, dynamic programming. Crucial for technical interviews.', department: 'Computer Science', instructor: instructors[0]._id, credits: 4, semester: 'Fall', year: 2024, category: 'Engineering', tags: ['Algorithms', 'DSA', 'Python'], enrolledStudents: [students[0]._id, students[4]._id] },
      { title: 'Statistical Methods in Research', code: 'MATH305', description: 'Applied statistics, hypothesis testing, regression analysis, and research methodology for graduate students.', department: 'Mathematics', instructor: instructors[1]._id, credits: 3, semester: 'Spring', year: 2024, category: 'Mathematics', tags: ['Statistics', 'Research', 'SPSS'] },
      { title: 'Cloud Computing & DevOps', code: 'CS410', description: 'AWS, Docker, Kubernetes, CI/CD pipelines. Learn to build and deploy scalable cloud applications.', department: 'Computer Science', instructor: instructors[2]._id, credits: 4, semester: 'Fall', year: 2024, category: 'Engineering', tags: ['AWS', 'Docker', 'DevOps', 'Cloud'] },
      { title: 'Project Management Professional', code: 'BUS401', description: 'PMP certification preparation, Agile/Scrum methodologies, risk management, and stakeholder communication.', department: 'Business', instructor: instructors[3]._id, credits: 3, semester: 'Spring', year: 2024, category: 'Business', tags: ['PMP', 'Agile', 'Scrum'] }
    ]);

    // Enroll students in their courses
    await User.findByIdAndUpdate(students[0]._id, { enrolledCourses: [courses[0]._id, courses[2]._id, courses[4]._id] });
    await User.findByIdAndUpdate(students[1]._id, { enrolledCourses: [courses[0]._id, courses[1]._id] });
    await User.findByIdAndUpdate(students[2]._id, { enrolledCourses: [courses[0]._id, courses[6]._id] });
    await User.findByIdAndUpdate(students[3]._id, { enrolledCourses: [courses[3]._id] });
    await User.findByIdAndUpdate(students[4]._id, { enrolledCourses: [courses[2]._id, courses[4]._id] });

    // Create reviews with timestamps spread over 6 months
    const makeDate = (monthsAgo) => new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000);

    const reviewData = [
      { course: courses[0]._id, student: students[0]._id, rating: 5, contentQuality: 5, instructorClarity: 5, courseMaterial: 4, assessment: 5, title: 'Outstanding ML Course!', comment: 'Prof. Mitchell explains complex concepts with remarkable clarity. The hands-on projects really solidified my understanding.', pros: 'Excellent projects, clear explanations, responsive instructor', cons: 'Could use more examples on deep learning', semester: 'Fall', year: 2024, createdAt: makeDate(1) },
      { course: courses[0]._id, student: students[1]._id, rating: 4, contentQuality: 4, instructorClarity: 5, courseMaterial: 4, assessment: 4, title: 'Great Foundation in ML', comment: 'Solid course with practical examples. The professor is very knowledgeable and always willing to help.', pros: 'Practical focus, supportive instructor', cons: 'Assignments are quite challenging', semester: 'Fall', year: 2024, createdAt: makeDate(2) },
      { course: courses[0]._id, student: students[2]._id, rating: 5, contentQuality: 5, instructorClarity: 4, courseMaterial: 5, assessment: 5, title: 'Best CS Course Ever', comment: 'This course transformed how I think about data and algorithms.', pros: 'Comprehensive, well-structured, industry-relevant', cons: 'Heavy workload', semester: 'Fall', year: 2024, createdAt: makeDate(1) },
      { course: courses[2]._id, student: students[0]._id, rating: 5, contentQuality: 5, instructorClarity: 5, courseMaterial: 5, assessment: 4, title: 'Perfect Full Stack Guide', comment: 'Emily Chen is an incredible instructor. She breaks down complex web dev concepts into digestible chunks.', pros: 'Real-world projects, modern stack, great code reviews', cons: 'Pace is fast for complete beginners', semester: 'Fall', year: 2024, createdAt: makeDate(2) },
      { course: courses[2]._id, student: students[4]._id, rating: 4, contentQuality: 4, instructorClarity: 4, courseMaterial: 4, assessment: 4, title: 'Solid Web Dev Course', comment: 'Great introduction to full stack development. The portfolio projects really helped me land internships.', pros: 'Portfolio-ready projects, updated curriculum', cons: 'Some sections need more depth', semester: 'Fall', year: 2024, createdAt: makeDate(3) },
      { course: courses[1]._id, student: students[1]._id, rating: 4, contentQuality: 5, instructorClarity: 4, courseMaterial: 4, assessment: 3, title: 'Rigorous and Rewarding', comment: 'Dr. Patel is thorough and demanding. The course is tough but you learn a lot.', pros: 'Deep mathematical rigor, excellent professor expertise', cons: 'Exams are very hard', semester: 'Spring', year: 2024, createdAt: makeDate(4) },
      { course: courses[4]._id, student: students[0]._id, rating: 5, contentQuality: 5, instructorClarity: 5, courseMaterial: 5, assessment: 5, title: 'Must-Take for Every CS Student', comment: 'This DSA course is absolutely essential. Helped me crack multiple technical interviews.', pros: 'Interview-focused, problem-solving mindset, great explanations', cons: 'None', semester: 'Fall', year: 2024, createdAt: makeDate(1) },
      { course: courses[4]._id, student: students[4]._id, rating: 5, contentQuality: 5, instructorClarity: 5, courseMaterial: 4, assessment: 5, title: 'Exceptional Quality', comment: 'The best DSA resource I have come across. Prof. Mitchell teaches algorithms like a story.', pros: 'Engaging teaching style, comprehensive coverage', cons: 'More time on advanced graphs would be nice', semester: 'Fall', year: 2024, createdAt: makeDate(2) },
      { course: courses[3]._id, student: students[3]._id, rating: 4, contentQuality: 4, instructorClarity: 5, courseMaterial: 4, assessment: 4, title: 'Very Practical Business Course', comment: 'Dr. Kim brings real-world industry experience into the classroom.', pros: 'Industry-relevant, case study approach', cons: 'Tools section could be updated', semester: 'Spring', year: 2024, createdAt: makeDate(3) },
      { course: courses[6]._id, student: students[2]._id, rating: 5, contentQuality: 5, instructorClarity: 5, courseMaterial: 5, assessment: 4, title: 'Industry-Ready Cloud Skills', comment: 'This course made me job-ready in cloud and DevOps. The AWS labs are incredible.', pros: 'Hands-on labs, real cloud deployments, up-to-date content', cons: 'Requires prior Linux knowledge', semester: 'Fall', year: 2024, createdAt: makeDate(1) }
    ];

    for (const rd of reviewData) {
      await Review.create(rd);
    }

    res.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        admin: 1,
        instructors: instructors.length,
        students: students.length,
        courses: courses.length,
        reviews: reviewData.length
      },
      credentials: {
        admin: { email: 'admin@university.edu', password: 'admin123' },
        instructor: { email: 'sarah@university.edu', password: 'inst123' },
        student: { email: 'alex@student.edu', password: 'student123' }
      }
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Serve Frontend SPA ───────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Connect MongoDB & Start ───────────────────────────────────
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`\n🚀 EduRate Course Portal running at http://localhost:${PORT}`);
    console.log(`📊 DB Status: ${isDbConnected ? '✅ MongoDB Connected' : '⚠️  Demo Mode (no MongoDB)'}`);
    console.log(`\nDemo Credentials:`);
    console.log(`  🔴 Admin:      admin@university.edu  /  admin123`);
    console.log(`  🔵 Instructor: sarah@university.edu  /  inst123`);
    console.log(`  🟢 Student:    alex@student.edu      /  student123\n`);
  });
};

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    isDbConnected = true;
    console.log('✅ MongoDB connected successfully to:', MONGODB_URI);
    startServer();
  })
  .catch(err => {
    isDbConnected = false;
    console.warn('⚠️  MongoDB connection failed:', err.message);
    console.log('Starting in DEMO mode (no database)...\n');
    startServer();
  });

// Handle disconnection events
mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
  console.warn('⚠️  MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  isDbConnected = true;
  console.log('✅ MongoDB reconnected');
});
