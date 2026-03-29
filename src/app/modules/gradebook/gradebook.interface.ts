import { Model, Types } from 'mongoose';

export enum GRADE_STATUS {
  PENDING = 'PENDING',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
}

export enum ASSESSMENT_TYPE {
  QUIZ = 'QUIZ',
}

export type IGrade = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  assessmentType: ASSESSMENT_TYPE;
  assessmentId: Types.ObjectId;
  assessmentTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: GRADE_STATUS;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  feedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GradeModel = Model<IGrade>;

