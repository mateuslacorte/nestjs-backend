import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from '../schemas/outbox-event.schema';

export interface PendingMongoEntry {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  retries: number;
}

@Injectable()
export class OutboxMongoRepository {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
  ) {}

  async create(doc: Record<string, unknown>, session?: ClientSession): Promise<void> {
    if (session) {
      await this.model.create([doc], { session });
    } else {
      await this.model.create(doc);
    }
  }

  async findPending(): Promise<PendingMongoEntry[]> {
    const docs = await this.model
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(100)
      .exec();
    return docs.map(doc => ({
      id: doc._id.toString(),
      eventType: doc.eventType,
      payload: doc.payload,
      retries: doc.retries,
    }));
  }

  async update(
    id: string,
    fields: { status?: string; publishedAt?: Date | null; retries?: number },
  ): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $set: fields }).exec();
  }
}
