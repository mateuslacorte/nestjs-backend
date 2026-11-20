import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from '../schemas/outbox-event.schema';

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
}
