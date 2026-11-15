import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEntry, OutboxStatus } from '../entities/outbox-entry.entity';

@Injectable()
export class OutboxPostgresRepository {
  constructor(
    @InjectRepository(OutboxEntry)
    private readonly repo: Repository<OutboxEntry>,
  ) {}

  async save(entry: Partial<OutboxEntry>, em?: EntityManager): Promise<void> {
    if (em) {
      await em.getRepository(OutboxEntry).save(entry);
    } else {
      await this.repo.save(entry);
    }
  }

  async findPending(): Promise<OutboxEntry[]> {
    return this.repo.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async update(id: string, fields: Partial<Pick<OutboxEntry, 'status' | 'publishedAt' | 'retries'>>): Promise<void> {
    await this.repo.update(id, fields);
  }
}
