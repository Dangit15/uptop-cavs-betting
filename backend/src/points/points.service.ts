import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Points, PointsDocument } from './schemas/points.schema';

@Injectable()
export class PointsService {
  constructor(
    @InjectModel(Points.name) private readonly pointsModel: Model<PointsDocument>,
  ) {}

  async addPoints(userId: string, amount: number): Promise<PointsDocument> {
    const normalizedUserId = String(userId);
    return this.pointsModel
      .findOneAndUpdate(
        { userId: normalizedUserId },
        { $inc: { totalPoints: amount } },
        { new: true, upsert: true },
      )
      .exec();
  }

  async getPointsForUser(userId: string): Promise<number> {
    const normalizedUserId = String(userId);
    const doc = await this.pointsModel
      .findOne({ userId: normalizedUserId })
      .lean()
      .exec();
    return doc?.totalPoints ?? 0;
  }
}
