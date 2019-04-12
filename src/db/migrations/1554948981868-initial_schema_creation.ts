import { MigrationInterface, QueryRunner } from 'typeorm'

export class initialSchemaCreation1554948981868 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE TABLE `DynamoPerRequestPrice` (`region` varchar(64) NOT NULL, `read` double NOT NULL, `write` double NOT NULL, PRIMARY KEY (`region`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `DynamoProvisionedPrice` (`region` varchar(64) NOT NULL, `read` double NOT NULL, `write` double NOT NULL, PRIMARY KEY (`region`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `DynamoStoragePrice` (`region` varchar(64) NOT NULL, `gbPerMonthPrice` double NOT NULL, PRIMARY KEY (`region`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `DynamoTable` (`tenantId` varchar(64) NOT NULL, `name` varchar(128) NOT NULL, `region` varchar(64) NOT NULL, `billingMode` varchar(64) NOT NULL, `sizeBytes` bigint NOT NULL, `items` bigint NOT NULL, PRIMARY KEY (`tenantId`, `name`, `region`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `DynamoTableStats` (`tenantId` varchar(64) NOT NULL, `name` varchar(128) NOT NULL, `region` varchar(64) NOT NULL, `dateTime` datetime NOT NULL, `consumedRead` bigint NOT NULL, `consumedWrite` bigint NOT NULL, `provisionedRead` bigint NOT NULL, `provisionedWrite` bigint NOT NULL, `throttledReads` bigint NOT NULL, `throttledWrites` bigint NOT NULL, PRIMARY KEY (`tenantId`, `name`, `region`, `dateTime`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `LambdaConfiguration` (`tenantId` varchar(64) NOT NULL, `name` varchar(64) NOT NULL, `region` varchar(64) NOT NULL, `runtime` varchar(64) NOT NULL, `codeSize` bigint NOT NULL, `timeout` smallint NOT NULL, `size` smallint NOT NULL, PRIMARY KEY (`tenantId`, `name`, `region`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `LambdaStats` (`tenantId` varchar(64) NOT NULL, `lambdaName` varchar(64) NOT NULL, `region` varchar(64) NOT NULL, `dateTime` datetime NOT NULL, `invocations` bigint NOT NULL, `errors` bigint NOT NULL, `maxDuration` double NOT NULL, `averageDuration` double NOT NULL, PRIMARY KEY (`tenantId`, `lambdaName`, `region`, `dateTime`)) ENGINE=InnoDB')
    await queryRunner.query('CREATE TABLE `LambdaPrice` (`size` varchar(64) NOT NULL, `price` double NOT NULL, PRIMARY KEY (`size`)) ENGINE=InnoDB')
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE `LambdaPrice`')
    await queryRunner.query('DROP TABLE `LambdaStats`')
    await queryRunner.query('DROP TABLE `LambdaConfiguration`')
    await queryRunner.query('DROP TABLE `DynamoTableStats`')
    await queryRunner.query('DROP TABLE `DynamoTable`')
    await queryRunner.query('DROP TABLE `DynamoStoragePrice`')
    await queryRunner.query('DROP TABLE `DynamoProvisionedPrice`')
    await queryRunner.query('DROP TABLE `DynamoPerRequestPrice`')
  }
}
