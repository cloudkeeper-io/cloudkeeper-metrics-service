import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('DynamoProvisionedPrice')
export class DynamoProvisionedPrice {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column('double')
  read: number

  @Column('double')
  write: number
}
