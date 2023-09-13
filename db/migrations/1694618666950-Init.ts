import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1694618666950 implements MigrationInterface {
  name = 'Init1694618666950';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "provider" ("id" SERIAL NOT NULL, "slug" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "imagePath" text, "parentProvider" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6ab2f66d8987bf1bfdd6136a2d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "game" ("id" SERIAL NOT NULL, "gameId" character varying NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(150) NOT NULL, "url" character varying, "imagePath" text, "bannerPath" text, "status" boolean NOT NULL DEFAULT '1', "type" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "providerId" integer, CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_74700caf3ddd51b8f8d517f2fea" FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "game" DROP CONSTRAINT "FK_74700caf3ddd51b8f8d517f2fea"`,
    );
    await queryRunner.query(`DROP TABLE "game"`);
    await queryRunner.query(`DROP TABLE "provider"`);
  }
}
