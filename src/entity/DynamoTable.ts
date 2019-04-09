import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('DynamoTable')
export class DynamoTable {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 128 })
  name: string

  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column({ type: 'varchar', length: 64 })
  billingMode: string

  @Column('bigint')
  sizeBytes: number

  @Column('bigint')
  items: number
}
