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

  async purgeOldFailed(olderThanMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('status = :status AND "createdAt" < :cutoff', {
        status: OutboxStatus.FAILED,
        cutoff,
      })
      .execute();
    return result.affected ?? 0;
  }
}
