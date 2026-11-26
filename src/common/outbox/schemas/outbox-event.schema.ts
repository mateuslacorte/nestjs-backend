import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OutboxStatus } from '../entities/outbox-entry.entity';

@Schema({ timestamps: false, collection: 'outbox_events' })
export class OutboxEvent extends Document {
  @Prop({ required: true })
  aggregateType!: string;

  @Prop({ required: true })
  aggregateId!: string;

  @Prop({ required: true })
  eventType!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ required: true, type: String, enum: Object.values(OutboxStatus), default: OutboxStatus.PENDING })
  status!: OutboxStatus;

  @Prop({ required: true, type: Date })
  createdAt!: Date;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Number, default: 0 })
  retries!: number;
}

export type OutboxEventDocument = OutboxEvent & Document;

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxEventSchema.index({ status: 1, createdAt: 1 });
