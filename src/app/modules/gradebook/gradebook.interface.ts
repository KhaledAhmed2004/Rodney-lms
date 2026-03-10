import { Model, Types } from 'mongoose';

export enum GRADE_STATUS {
  PENDING = 'PENDING',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
}

export enum ASSESSMENT_TYPE {
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum SUBMISSION_STATUS {
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
  RESUBMITTED = 'RESUBMITTED',
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

export type IAttachment = {
  url: string;
  name: string;
  size?: number;
};

export type IAssignmentSubmission = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  enrollment: Types.ObjectId;
  content: string;
  attachments: IAttachment[];
  status: SUBMISSION_STATUS;
  submittedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AssignmentSubmissionModel = Model<IAssignmentSubmission>;
