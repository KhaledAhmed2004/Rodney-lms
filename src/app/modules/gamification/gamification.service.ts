import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IBadge, POINTS_REASON } from './gamification.interface';
import { PointsLedger, Badge, StudentBadge } from './gamification.model';
import { User } from '../user/user.model';

// ==================== LEADERBOARD ====================
const getLeaderboard = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const leaderboard = await PointsLedger.aggregate([
    { $group: { _id: '$student', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
        pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
      },
    },
    { $unwind: '$student' },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        name: '$student.name',
        profilePicture: '$student.profilePicture',
        totalPoints: 1,
      },
    },
  ]);

  const totalStudents = await PointsLedger.distinct('student');

  return {
    data: leaderboard,
    pagination: {
      page,
      limit,
      total: totalStudents.length,
      totalPage: Math.ceil(totalStudents.length / limit),
    },
  };
};

// ==================== STUDENT POINTS ====================
const getMyPoints = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const totalResult = await PointsLedger.aggregate([
    { $match: { student: new Types.ObjectId(studentId) } },
    { $group: { _id: null, total: { $sum: '$points' } } },
  ]);
  const totalPoints = totalResult[0]?.total || 0;

  const ledgerQuery = new QueryBuilder(
    PointsLedger.find({ student: studentId }),
    query,
  )
    .sort()
    .paginate();

  const history = await ledgerQuery.modelQuery;
  const pagination = await ledgerQuery.getPaginationInfo();

  return { totalPoints, history, pagination };
};

// ==================== STUDENT BADGES ====================
const getMyBadges = async (studentId: string) => {
  const [earnedBadges, totalBadges] = await Promise.all([
    StudentBadge.find({ student: studentId })
      .populate('badge', 'name icon')
      .sort({ earnedAt: -1 })
      .lean(),
    Badge.countDocuments({ isActive: true }),
  ]);

  const validBadges = earnedBadges.filter(({ badge }) => badge);

  return {
    totalBadges,
    earnedBadges: validBadges.length,
    badges: validBadges.map(({ badge, earnedAt }) => ({
      name: (badge as any).name,
      icon: (badge as any).icon,
      earnedAt,
    })),
  };
};

const getMySummary = async (studentId: string) => {
  const totalResult = await PointsLedger.aggregate([
    { $match: { student: new Types.ObjectId(studentId) } },
    { $group: { _id: null, total: { $sum: '$points' } } },
  ]);
  const totalPoints = totalResult[0]?.total || 0;

  const totalBadges = await StudentBadge.countDocuments({ student: studentId });

  const topBadge = await StudentBadge.findOne({ student: studentId })
    .populate('badge', 'name icon')
    .sort({ earnedAt: -1 });

  return {
    totalPoints,
    totalBadges,
    topBadge: topBadge ? (topBadge as any).badge : null,
  };
};

// ==================== BADGE CRUD (Admin) ====================
const createBadge = async (
  payload: Partial<IBadge> & { icon?: string },
): Promise<IBadge> => {
  const existing = await Badge.findOne({ name: payload.name });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Badge with this name already exists',
    );
  }
  const result = await Badge.create(payload);
  return result;
};

const getAllBadges = async (query: Record<string, unknown>) => {
  const badgeQuery = new QueryBuilder(Badge.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate();

  const data = await badgeQuery.modelQuery;
  const pagination = await badgeQuery.getPaginationInfo();
  return { pagination, data };
};

const updateBadge = async (
  id: string,
  payload: Partial<IBadge>,
): Promise<IBadge | null> => {
  const existing = await Badge.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Badge not found');
  }
  const result = await Badge.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteBadge = async (id: string): Promise<void> => {
  const existing = await Badge.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Badge not found');
  }
  await StudentBadge.deleteMany({ badge: id });
  await Badge.findByIdAndDelete(id);
};

// ==================== ADMIN: Manual Points Adjust ====================
const adjustPoints = async (
  studentId: string,
  points: number,
  description: string,
): Promise<void> => {
  await PointsLedger.create({
    student: studentId,
    points,
    reason: POINTS_REASON.ADMIN_ADJUST,
    description,
  });

  await User.findByIdAndUpdate(studentId, { $inc: { totalPoints: points } });
};

// ==================== ADMIN STATS ====================
const getAdminStats = async () => {
  const [totalPointsDistributed, topEarners, mostEarnedBadges] =
    await Promise.all([
      PointsLedger.aggregate([
        { $match: { points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      PointsLedger.aggregate([
        { $group: { _id: '$student', total: { $sum: '$points' } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'student',
            pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
          },
        },
        { $unwind: '$student' },
      ]),
      StudentBadge.aggregate([
        { $group: { _id: '$badge', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'badges',
            localField: '_id',
            foreignField: '_id',
            as: 'badge',
            pipeline: [{ $project: { name: 1, icon: 1 } }],
          },
        },
        { $unwind: '$badge' },
      ]),
    ]);

  return {
    totalPointsDistributed: totalPointsDistributed[0]?.total || 0,
    topEarners,
    mostEarnedBadges,
  };
};

export const GamificationService = {
  getLeaderboard,
  getMyPoints,
  getMyBadges,
  getMySummary,
  createBadge,
  getAllBadges,
  updateBadge,
  deleteBadge,
  adjustPoints,
  getAdminStats,
};
