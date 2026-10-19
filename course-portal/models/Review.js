const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  // Detailed ratings
  contentQuality: { type: Number, min: 1, max: 5 },
  instructorClarity: { type: Number, min: 1, max: 5 },
  courseMaterial: { type: Number, min: 1, max: 5 },
  assessment: { type: Number, min: 1, max: 5 },
  // Text feedback
  title: { type: String, trim: true, maxlength: 100 },
  comment: { type: String, trim: true, maxlength: 1000 },
  pros: { type: String, trim: true, maxlength: 500 },
  cons: { type: String, trim: true, maxlength: 500 },
  // Metadata
  isAnonymous: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0 },
  semester: { type: String },
  year: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Prevent duplicate reviews
reviewSchema.index({ course: 1, student: 1 }, { unique: true });

// Auto-update course average rating after save
reviewSchema.post('save', async function() {
  const Course = mongoose.model('Course');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { course: this.course } },
    { $group: { _id: '$course', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (stats.length > 0) {
    await Course.findByIdAndUpdate(this.course, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalRatings: stats[0].count
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
