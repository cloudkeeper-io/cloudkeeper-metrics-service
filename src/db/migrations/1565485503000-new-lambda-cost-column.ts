/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class newLambdaCostColumn1565485503000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table LambdaStats add column cost double not null')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE LambdaStats DROP cost')
  }
}
