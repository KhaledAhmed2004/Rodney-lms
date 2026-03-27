import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IBadge } from './gamification.interface';
import { PointsLedger, Badge, StudentBadge } from './gamification.model';

// ==================== LEADERBOARD ====================
const getLeaderboard = async (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const result = await PointsLedger.aggregate([
    { $group: { _id: '$student', totalPoints: { $sum: '$points' } } },
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
      $lookup: {
        from: 'studentbadges',
        localField: '_id',
        foreignField: 'student',
        as: 'badges',
      },
    },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        name: '$student.name',
        profilePicture: '$student.profilePicture',
        totalPoints: 1,
        badgeCount: { $size: '$badges' },
      },
    },
    {
      $facet: {
        data: [
          { $sort: { totalPoints: -1 as const } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const data = result[0]?.data ?? [];
  const total = result[0]?.total[0]?.count ?? 0;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
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
    PointsLedger.find({ student: studentId }).select(
      'points reason description referenceId referenceType createdAt',
    ),
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
const getAllBadges = async (query: Record<string, unknown>) => {
  const badgeQuery = new QueryBuilder(
    Badge.find().select('-description -createdAt -updatedAt -__v'),
    query,
  )
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
  payload: Pick<Partial<IBadge>, 'description' | 'isActive'> & {
    criteria?: { threshold: number };
  },
): Promise<IBadge | null> => {
  const existing = await Badge.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Badge not found');
  }

  const updateData: Record<string, unknown> = {};
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
  if (payload.criteria?.threshold !== undefined) {
    updateData['criteria.threshold'] = payload.criteria.threshold;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid fields to update');
  }

  const result = await Badge.findByIdAndUpdate(id, updateData, { new: true })
    .select('-createdAt -updatedAt -__v');
  return result;
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
  getAllBadges,
  updateBadge,
  getAdminStats,
};
