import { Model } from 'mongoose';

export enum USER_ROLES {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STUDENT = 'STUDENT',
}

export enum USER_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESTRICTED = 'RESTRICTED',
  DELETE = 'DELETE',
}

export type AchievementType =
  | 'Founder Titne'
  | 'Fast 100 Titten'
  | 'Top Rated Tittens'
  | '100 plus Tasks Completed'
  | 'Founder Poster'
  | 'Top Rated Poster';

export type IStreak = {
  current: number;
  longest: number;
  lastActiveDate?: Date;
};

export type IUser = {
  name: string;
  role: USER_ROLES;
  email: string;
  password: string;
  location: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  phone: string;
  profilePicture?: string;
  status: USER_STATUS;
  verified: boolean;
  deviceTokens?: string[];
  averageRating: number;
  ratingsCount: number;
  about?: string;
  achievements?: AchievementType[];
  totalPoints: number;
  streak: IStreak;
  onboardingCompleted: boolean;
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;

  addDeviceToken(userId: string, token: string): Promise<IUser | null>;
  removeDeviceToken(userId: string, token: string): Promise<IUser | null>;
} & Model<IUser>;
