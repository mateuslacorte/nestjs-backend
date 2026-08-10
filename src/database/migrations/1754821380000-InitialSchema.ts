import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1754821380000 implements MigrationInterface {
    name = 'InitialSchema1754821380000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "username" character varying NOT NULL,
                "firstName" character varying NOT NULL,
                "lastName" character varying NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "roles" text NOT NULL,
                "googleId" character varying,
                "facebookId" character varying,
                "twitterId" character varying,
                "githubId" character varying,
                "figmaId" character varying,
                "linkedinId" character varying,
                "slackId" character varying,
                "atlassianId" character varying,
                "gitlabId" character varying,
                "bitbucketId" character varying,
                "discordId" character varying,
                "twitchId" character varying,
                "steamId" character varying,
                "redditId" character varying,
                "appleId" character varying,
                "amazonId" character varying,
                "patreonId" character varying,
                "dropboxId" character varying,
                "metamaskId" character varying,
                "activeDirectoryId" character varying,
                "passwordResetToken" character varying,
                "passwordResetExpires" TIMESTAMP,
                "emailVerificationToken" character varying,
                "emailVerificationExpires" TIMESTAMP,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_users_username" UNIQUE ("username"),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
                CONSTRAINT "UQ_users_facebookId" UNIQUE ("facebookId"),
                CONSTRAINT "UQ_users_twitterId" UNIQUE ("twitterId"),
                CONSTRAINT "UQ_users_githubId" UNIQUE ("githubId"),
                CONSTRAINT "UQ_users_figmaId" UNIQUE ("figmaId"),
                CONSTRAINT "UQ_users_linkedinId" UNIQUE ("linkedinId"),
                CONSTRAINT "UQ_users_slackId" UNIQUE ("slackId"),
                CONSTRAINT "UQ_users_atlassianId" UNIQUE ("atlassianId"),
                CONSTRAINT "UQ_users_gitlabId" UNIQUE ("gitlabId"),
                CONSTRAINT "UQ_users_bitbucketId" UNIQUE ("bitbucketId"),
                CONSTRAINT "UQ_users_discordId" UNIQUE ("discordId"),
                CONSTRAINT "UQ_users_twitchId" UNIQUE ("twitchId"),
                CONSTRAINT "UQ_users_steamId" UNIQUE ("steamId"),
                CONSTRAINT "UQ_users_redditId" UNIQUE ("redditId"),
                CONSTRAINT "UQ_users_appleId" UNIQUE ("appleId"),
                CONSTRAINT "UQ_users_amazonId" UNIQUE ("amazonId"),
                CONSTRAINT "UQ_users_patreonId" UNIQUE ("patreonId"),
                CONSTRAINT "UQ_users_dropboxId" UNIQUE ("dropboxId"),
                CONSTRAINT "UQ_users_metamaskId" UNIQUE ("metamaskId"),
                CONSTRAINT "UQ_users_activeDirectoryId" UNIQUE ("activeDirectoryId")
            )
        `);
        await queryRunner.query(
            `CREATE INDEX "IDX_users_createdAt_id" ON "users" ("createdAt", "id")`,
        );

        await queryRunner.query(`
            CREATE TABLE "blocked_ips" (
                "id" uuid NOT NULL,
                "ip" character varying(45) NOT NULL,
                "attempts" integer NOT NULL DEFAULT 0,
                "blocked" boolean NOT NULL DEFAULT false,
                "blockedAt" TIMESTAMP WITH TIME ZONE,
                "lastAttemptAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "paths" text NOT NULL,
                "userAgent" text,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_blocked_ips_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_blocked_ips_ip" ON "blocked_ips" ("ip")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_blocked_ips_blocked" ON "blocked_ips" ("blocked")`,
        );

        await queryRunner.query(`
            CREATE TABLE "audit" (
                "id" uuid NOT NULL,
                "action" character varying(128) NOT NULL,
                "category" character varying(64),
                "description" character varying(512),
                "ip" character varying(45) NOT NULL,
                "port" integer,
                "success" boolean NOT NULL,
                "provider" character varying(64),
                "identifier" character varying(320),
                "userId" uuid,
                "failureReason" character varying(512),
                "userAgent" text,
                "metadata" jsonb,
                "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_audit_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_ip" ON "audit" ("ip")`);
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_success" ON "audit" ("success")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_timestamp" ON "audit" ("timestamp")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_action" ON "audit" ("action")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_category" ON "audit" ("category")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_audit_timestamp_id" ON "audit" ("timestamp", "id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_timestamp_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_action"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_timestamp"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_success"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_ip"`);
        await queryRunner.query(`DROP TABLE "audit"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_blocked_ips_blocked"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_blocked_ips_ip"`);
        await queryRunner.query(`DROP TABLE "blocked_ips"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_users_createdAt_id"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
