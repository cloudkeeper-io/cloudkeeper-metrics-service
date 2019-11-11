/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class newLambdaPricingTable1565426555000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE LambdaPrice')
    await queryRunner.query('CREATE TABLE `LambdaPrice` (`region` varchar(64) NOT NULL, `pricePerGbSeconds` double NOT NULL, `requestPrice` double NOT NULL, PRIMARY KEY (`region`)) ENGINE=InnoDB')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE LambdaPrice')
  }
}
