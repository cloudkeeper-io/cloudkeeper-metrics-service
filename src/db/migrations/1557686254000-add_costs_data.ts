/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addCostsData implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE TABLE `CostData` (`tenantId` varchar(64) NOT NULL, `serviceName` varchar(128) NOT NULL, `stackName` varchar(256) NULL, `date` date NOT NULL, `blendedCost` double not null, PRIMARY KEY (`tenantId`, `serviceName`, `stackName`, `date`)) ENGINE=InnoDB')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE `CostData`')
  }
}
