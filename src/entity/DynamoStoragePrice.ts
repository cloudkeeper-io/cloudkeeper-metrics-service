import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('DynamoStoragePrice')
export class DynamoStoragePrice {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column('double')
  gbPerMonthPrice: number
}
