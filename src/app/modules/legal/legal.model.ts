import { model, Schema } from 'mongoose';
import { ILegalPage, LegalPageModel } from './legal.interface';

const legalPageSchema = new Schema<ILegalPage, LegalPageModel>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const LegalPage = model<ILegalPage, LegalPageModel>(
  'LegalPage',
  legalPageSchema,
);
