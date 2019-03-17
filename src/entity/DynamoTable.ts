import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('DynamoTable')
export class DynamoTable {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 128 })
  name: string

  @Column('bigint')
  sizeBytes: number

  @Column('bigint')
  items: number
}
