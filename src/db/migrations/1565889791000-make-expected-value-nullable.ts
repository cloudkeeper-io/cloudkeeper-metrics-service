/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class newLambdaCostColumn1565485503000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table Event modify expectedValue varchar(256) null')
    await queryRunner.query('update Event set expectedValue = NULL where expectedValue = \'\'')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table Event modify expectedValue double not null')
  }
}
