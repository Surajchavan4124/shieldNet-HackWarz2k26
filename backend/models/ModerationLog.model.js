import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlaggedPost',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    moderatorId: {
      type: String,
      default: 'system', // or an actual ObjectId if you add User models later
    },
  },
  {
    timestamps: true,
  }
);

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;
