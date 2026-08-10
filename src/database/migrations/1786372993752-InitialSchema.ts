import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1786372993752 implements MigrationInterface {
    name = 'InitialSchema1786372993752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying, "isActive" boolean NOT NULL DEFAULT true, "roles" text NOT NULL, "googleId" character varying, "facebookId" character varying, "twitterId" character varying, "githubId" character varying, "figmaId" character varying, "linkedinId" character varying, "slackId" character varying, "atlassianId" character varying, "gitlabId" character varying, "bitbucketId" character varying, "discordId" character varying, "twitchId" character varying, "steamId" character varying, "appleId" character varying, "amazonId" character varying, "patreonId" character varying, "dropboxId" character varying, "metamaskId" character varying, "activeDirectoryId" character varying, "passwordResetToken" character varying, "passwordResetExpires" TIMESTAMP, "emailVerificationToken" character varying, "emailVerificationExpires" TIMESTAMP, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "UQ_f9740e1e654a5daddb82c60bd75" UNIQUE ("facebookId"), CONSTRAINT "UQ_eda3fd04bdb78a1c678fdb6ecc9" UNIQUE ("twitterId"), CONSTRAINT "UQ_42148de213279d66bf94b363bf2" UNIQUE ("githubId"), CONSTRAINT "UQ_04770524b5ca9ccab7de02f4a2d" UNIQUE ("figmaId"), CONSTRAINT "UQ_d9496f6296066451ae170859446" UNIQUE ("linkedinId"), CONSTRAINT "UQ_2c63df0d1fc9c2c81882577fa41" UNIQUE ("slackId"), CONSTRAINT "UQ_ee8e83599d988836b61cc0d830a" UNIQUE ("atlassianId"), CONSTRAINT "UQ_6e9d7dd75808fafb54f87e214d7" UNIQUE ("gitlabId"), CONSTRAINT "UQ_0487ad3b53cd5fcf441e8400364" UNIQUE ("bitbucketId"), CONSTRAINT "UQ_ae4a93a6b25195ccc2a97e13f0d" UNIQUE ("discordId"), CONSTRAINT "UQ_b975a0902f78b8c7a00f909f3c7" UNIQUE ("twitchId"), CONSTRAINT "UQ_0827cd828b990ba2a928ac5fd20" UNIQUE ("steamId"), CONSTRAINT "UQ_60cea0d80c39eedaaaf5e21f175" UNIQUE ("appleId"), CONSTRAINT "UQ_cfb811e66417b095ad117980ffc" UNIQUE ("amazonId"), CONSTRAINT "UQ_f34517e45b21a74619a26ecefe9" UNIQUE ("patreonId"), CONSTRAINT "UQ_30f33fe81e7a59fc05c3fdf7905" UNIQUE ("dropboxId"), CONSTRAINT "UQ_72761a6cfb5e111a7a67d7da9d1" UNIQUE ("metamaskId"), CONSTRAINT "UQ_8e9abe9fc46c56898b0e5e37887" UNIQUE ("activeDirectoryId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_603379383366b71239acc25e26" ON "users"  ("createdAt", "id") `);
        await queryRunner.query(`CREATE TABLE "audit" ("id" uuid NOT NULL, "action" character varying(128) NOT NULL, "category" character varying(64), "description" character varying(512), "ip" character varying(45) NOT NULL, "port" integer, "success" boolean NOT NULL, "provider" character varying(64), "identifier" character varying(320), "userId" uuid, "failureReason" character varying(512), "userAgent" text, "metadata" jsonb, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_1d3d120ddaf7bc9b1ed68ed463a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7812a48210638b73d9540b08f9" ON "audit"  ("timestamp", "id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5528a511e767aef4631777e705" ON "audit"  ("category") `);
        await queryRunner.query(`CREATE INDEX "IDX_b1ca64deb2106e52a38d49dfa7" ON "audit"  ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_39d8292e578323f52e60fe59da" ON "audit"  ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_798610ee4785f19d3be188ca2b" ON "audit"  ("success") `);
        await queryRunner.query(`CREATE INDEX "IDX_722318ae18284ffe767c52c374" ON "audit"  ("ip") `);
        await queryRunner.query(`CREATE TABLE "blocked_ips" ("id" uuid NOT NULL, "ip" character varying(45) NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "blocked" boolean NOT NULL DEFAULT false, "blockedAt" TIMESTAMP WITH TIME ZONE, "lastAttemptAt" TIMESTAMP WITH TIME ZONE NOT NULL, "paths" text NOT NULL, "userAgent" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e86c3986ac081ad24d5443bb6c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_38ede6c905842a90f62c435adf" ON "blocked_ips"  ("blocked") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f37ae6ed05d1c3853af0fc8409" ON "blocked_ips"  ("ip") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f37ae6ed05d1c3853af0fc8409"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38ede6c905842a90f62c435adf"`);
        await queryRunner.query(`DROP TABLE "blocked_ips"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_722318ae18284ffe767c52c374"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_798610ee4785f19d3be188ca2b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39d8292e578323f52e60fe59da"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1ca64deb2106e52a38d49dfa7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5528a511e767aef4631777e705"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7812a48210638b73d9540b08f9"`);
        await queryRunner.query(`DROP TABLE "audit"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_603379383366b71239acc25e26"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
