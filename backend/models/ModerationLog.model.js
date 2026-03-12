import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlaggedPost',
      required: true,
    },
    action_type: {
      type: String,
      required: true,
      enum: ['review', 'remove', 'ignore'],
    },
    moderator_decision: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;
