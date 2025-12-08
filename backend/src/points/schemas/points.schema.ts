import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PointsDocument = Points & Document;

@Schema({ timestamps: true })
export class Points {
  @Prop({ unique: true, required: true })
  userId: string;

  @Prop({ default: 0 })
  totalPoints: number;
}

export const PointsSchema = SchemaFactory.createForClass(Points);
