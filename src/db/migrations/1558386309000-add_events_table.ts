/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class addEventsTable1558386309000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE TABLE `Event` (`tenantId` varchar(64) NOT NULL, `serviceName` varchar(128) NOT NULL, `value` varchar(256) NOT NULL, `expectedValue` varchar(256) NOT NULL, `dimension` varchar(256) NOT NULL, `dateTime` datetime NOT NULL, `message` varchar(256) NOT NULL, PRIMARY KEY (`tenantId`, `serviceName`, `dimension`, `dateTime`)) ENGINE=InnoDB')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE `Event`')
  }
}
