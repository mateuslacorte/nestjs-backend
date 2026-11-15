import { MigrationInterface, QueryRunner } from 'typeorm';

export class OutboxEntries1747900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE outbox_status_enum AS ENUM ('pending', 'published', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE outbox_entries (
        id          UUID PRIMARY KEY,
        "aggregateType" VARCHAR(128) NOT NULL,
        "aggregateId"   VARCHAR(36)  NOT NULL,
        "eventType"     VARCHAR(128) NOT NULL,
        payload         JSONB        NOT NULL,
        status          outbox_status_enum NOT NULL DEFAULT 'pending',
        "createdAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "publishedAt"   TIMESTAMP WITH TIME ZONE,
        retries         INTEGER NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_outbox_entries_status_created
        ON outbox_entries (status, "createdAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_entries`);
    await queryRunner.query(`DROP TYPE IF EXISTS outbox_status_enum`);
  }
}
