import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRedditId1754821400000 implements MigrationInterface {
    name = 'DropRedditId1754821400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_redditId"`,
        );
        await queryRunner.query(
            `ALTER TABLE "users" DROP COLUMN IF EXISTS "redditId"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "users" ADD COLUMN "redditId" character varying`,
        );
        await queryRunner.query(
            `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_redditId" UNIQUE ("redditId")`,
        );
    }
}
