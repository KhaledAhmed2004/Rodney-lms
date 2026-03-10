import { Model } from 'mongoose';

export type ILegalPage = {
  slug: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type LegalPageModel = {
  isExistBySlug(slug: string): Promise<ILegalPage | null>;
} & Model<ILegalPage>;
