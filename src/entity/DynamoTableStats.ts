import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('DynamoTableStats')
export class DynamoTableStats {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 128 })
  name: string

  @PrimaryColumn({ type: 'datetime' })
  dateTime: Date

  @Column('bigint')
  consumedRead: number

  @Column('bigint')
  consumedWrite: number

  @Column('bigint')
  provisionedRead: number

  @Column('bigint')
  provisionedWrite: number

  @Column('bigint')
  throttledReads: number

  @Column('bigint')
  throttledWrites: number
}
