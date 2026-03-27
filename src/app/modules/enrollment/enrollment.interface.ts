import { Model, Types } from 'mongoose';

export enum ENROLLMENT_STATUS {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
}

export type IEnrollmentProgress = {
  completedLessons: Types.ObjectId[];
  lastAccessedLesson?: Types.ObjectId;
  lastAccessedAt?: Date;
  completionPercentage: number;
};

export type IEnrollment = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  status: ENROLLMENT_STATUS;
  progress: IEnrollmentProgress;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type EnrollmentModel = {
  isExistById(id: string): Promise<IEnrollment | null>;
} & Model<IEnrollment>;
