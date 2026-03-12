import mongoose from 'mongoose';

const flaggedPostSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    fakeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    confidence: {
      type: String,
      required: true,
      enum: ['High', 'Medium', 'Low'],
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
    reportCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'safe', 'removed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const FlaggedPost = mongoose.model('FlaggedPost', flaggedPostSchema);

export default FlaggedPost;
