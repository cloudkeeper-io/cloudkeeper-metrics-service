/* eslint-disable max-len,class-methods-use-this */
import { MigrationInterface, QueryRunner } from 'typeorm'

export class fillPriceData1554949048122 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
      insert into DynamoPerRequestPrice (region, \`write\`, \`read\`) VALUES
      ('us-east-2', '1.25', '0.25'),
      ('us-west-1', '1.3942', '0.2788'),
      ('us-west-2', '1.25', '0.25'),
      ('ap-south-1', '1.4231', '0.2846'),
      ('us-east-1', '1.25', '0.25'),
      ('eu-west-1', '1.4135', '0.2827'),
      ('eu-central-1', '1.525', '0.305'),
      ('eu-west-2', '1.4846', '0.2969'),
      ('ca-central-1', '1.375', '0.275'),
      ('ap-northeast-1', '1.4269', '0.2854'),
      ('ap-northeast-2', '1.3556', '0.2711'),
      ('ap-southeast-1', '1.4231', '0.2846'),
      ('ap-southeast-2', '1.4231', '0.2846'),
      ('eu-north-1', '1.3428', '0.2686'),
      ('eu-west-3', '1.4846', '0.2969'),
      ('sa-east-1', '1.875', '0.375');
  `)
    await queryRunner.query(`
      insert into DynamoProvisionedPrice (region, \`write\`, \`read\`) VALUES
      ('us-east-2', '0.00065', '0.00013'),
      ('ap-northeast-2', '0.0007049', '0.00014098'),
      ('us-west-2', '0.00065', '0.00013'),
      ('ap-northeast-3', '0.000742', '0.0001484'),
      ('ap-southeast-2', '0.00074', '0.000148'),
      ('eu-west-1', '0.000735', '0.000147'),
      ('eu-north-1', '0.000698', '0.00014'),
      ('us-east-1', '0.00065', '0.00013'),
      ('us-west-1', '0.000725', '0.000145'),
      ('ap-south-1', '0.00074', '0.000148'),
      ('ap-southeast-1', '0.00074', '0.000148'),
      ('ap-northeast-1', '0.000742', '0.0001484'),
      ('ca-central-1', '0.000715', '0.000143'),
      ('eu-central-1', '0.000793', '0.0001586'),
      ('eu-west-2', '0.000772', '0.0001544'),
      ('eu-west-3', '0.000772', '0.0001544'),
      ('sa-east-1', '0.000975', '0.000195');
  `)
    await queryRunner.query(`
      insert into DynamoStoragePrice (region, gbPerMonthPrice) VALUES
      ('us-east-2', 0.25),
      ('us-west-1', 0.28),
      ('us-west-2', 0.25),
      ('ap-south-1', 0.285),
      ('us-east-1', 0.25),
      ('eu-west-1', 0.283),
      ('eu-central-1', 0.306),
      ('eu-west-2', 0.29715),
      ('ca-central-1', 0.275),
      ('ap-northeast-1', 0.285),
      ('ap-northeast-2', 0.27075),
      ('ap-southeast-1', 0.285),
      ('ap-southeast-2', 0.285),
      ('eu-north-1', 0.269),
      ('eu-west-3', 0.29715),
      ('sa-east-1', 0.375),
      ('ap-northeast-3', 0.285);
  `)
    await queryRunner.query(`
      insert into LambdaPrice (size, price) VALUES
      (128,0.000000208),
      (192,0.000000313),
      (256,0.000000417),
      (320,0.000000521),
      (384,0.000000625),
      (448,0.000000729),
      (512,0.000000834),
      (576,0.000000938),
      (640,0.000001042),
      (704,0.000001146),
      (768,0.000001250),
      (832,0.000001354),
      (896,0.000001459),
      (960,0.000001563),
      (1024,0.000001667),
      (1088,0.000001771),
      (1152,0.000001875),
      (1216,0.000001980),
      (1280,0.000002084),
      (1344,0.000002188),
      (1408,0.000002292),
      (1472,0.000002396),
      (1536,0.000002501),
      (1600,0.000002605),
      (1664,0.000002709),
      (1728,0.000002813),
      (1792,0.000002917),
      (1856,0.000003021),
      (1920,0.000003126),
      (1984,0.000003230),
      (2048,0.000003334),
      (2112,0.000003438),
      (2176,0.000003542),
      (2240,0.000003647),
      (2304,0.000003751),
      (2368,0.000003855),
      (2432,0.000003959),
      (2496,0.000004063),
      (2560,0.000004168),
      (2624,0.000004272),
      (2688,0.000004376),
      (2752,0.000004480),
      (2816,0.000004584),
      (2880,0.000004688),
      (2944,0.000004793),
      (3008,0.000004897);
  `)
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DELETE from `DynamoPerRequestPrice`')
    await queryRunner.query('DELETE from `DynamoProvisionedPrice`')
    await queryRunner.query('DELETE from `DynamoStoragePrice`')
    await queryRunner.query('DELETE from `LambdaPrice`')
  }
}
