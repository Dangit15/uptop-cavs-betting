import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { Points, PointsSchema } from './schemas/points.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Points.name, schema: PointsSchema }])],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
