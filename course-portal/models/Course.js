const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, required: true },
  department: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  credits: { type: Number, default: 3 },
  semester: { type: String, required: true },
  year: { type: Number, required: true },
  category: { 
    type: String, 
    enum: ['Engineering', 'Science', 'Mathematics', 'Arts', 'Business', 'Medicine', 'Law', 'Others'],
    default: 'Others'
  },
  thumbnail: { type: String, default: '' },
  tags: [String],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
