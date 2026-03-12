import mongoose from 'mongoose';

const flaggedPostSchema = new mongoose.Schema(
  {
    post_text: {
      type: String,
      required: true,
    },
    platform_source: {
      type: String,
      required: true,
      enum: ['Instagram', 'Facebook', 'Reddit', 'Twitter', 'Other'],
    },
    fake_probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    explanation: {
      type: String,
      required: true,
    },
    sources: [
      {
        title: String,
        url: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'removed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const FlaggedPost = mongoose.model('FlaggedPost', flaggedPostSchema);

export default FlaggedPost;
