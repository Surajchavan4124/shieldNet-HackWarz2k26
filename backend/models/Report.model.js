import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlaggedPost',
      required: true,
    },
    report_reason: {
      type: String,
      required: true,
    },
    report_count: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model('Report', reportSchema);

export default Report;
