import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('Event')
export class Event {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 256 })
  serviceName: string

  @Column({ type: 'varchar', length: 256 })
  value: string

  @Column({ type: 'varchar', length: 256 })
  expectedValue?: string

  @PrimaryColumn({ type: 'varchar', length: 256 })
  dimension: string

  @PrimaryColumn({ type: 'datetime' })
  dateTime: Date

  @Column({ type: 'varchar', length: 256 })
  message: string
}
