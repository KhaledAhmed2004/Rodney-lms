import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { Enrollment } from '../modules/enrollment/enrollment.model';
import { IEnrollment } from '../modules/enrollment/enrollment.interface';

const verifyEnrollment = async (
  studentId: string,
  courseId: string,
  allowedStatuses: string[] = ['ACTIVE'],
): Promise<IEnrollment> => {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    status: { $in: allowedStatuses },
  });
  if (!enrollment) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not enrolled in this course',
    );
  }
  return enrollment;
};

export const EnrollmentHelper = { verifyEnrollment };
