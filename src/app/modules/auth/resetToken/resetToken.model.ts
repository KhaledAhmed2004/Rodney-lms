import { model, Schema } from 'mongoose';
import { IResetToken, ResetTokenModel } from './resetToken.interface';

const resetTokenSchema = new Schema<IResetToken, ResetTokenModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    token: {
      type: String,
      required: true,
    },
    expireAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// token check
resetTokenSchema.statics.isExistToken = async function (
  this: ResetTokenModel,
  token: string
): Promise<IResetToken | null> {
  return await this.findOne({ token });
};

// token validity check
resetTokenSchema.statics.isExpireToken = async function (
  this: ResetTokenModel,
  token: string
): Promise<boolean> {
  const currentDate = new Date();
  const resetToken = await this.findOne({
    token,
    expireAt: { $gt: currentDate },
  });
  return !!resetToken;
};

// Query index for token lookups
resetTokenSchema.index({ token: 1 });

// Auto-delete expired tokens
resetTokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = model<IResetToken, ResetTokenModel>('Token', resetTokenSchema);
