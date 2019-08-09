/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addCostsDataToDynamoTables1565326883000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('alter table DynamoTableStats add column cost double not null')
    await queryRunner.query('alter table DynamoTableStats add column readCost double not null')
    await queryRunner.query('alter table DynamoTableStats add column writeCost double not null')
    await queryRunner.query('alter table DynamoTableStats add column storageCost double not null')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE DynamoTableStats DROP cost')
    await queryRunner.query('ALTER TABLE DynamoTableStats DROP readCost')
    await queryRunner.query('ALTER TABLE DynamoTableStats DROP writeCost')
    await queryRunner.query('ALTER TABLE DynamoTableStats DROP storageCost')
  }
}
