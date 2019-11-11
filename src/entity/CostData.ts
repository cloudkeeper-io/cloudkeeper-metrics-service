import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('CostData')
export class CostData {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 128 })
  serviceName: string

  @Column({ type: 'varchar', length: 256 })
  stackName: string

  @PrimaryColumn({ type: 'date' })
  date: Date

  @Column('double')
  blendedCost: number

  @Column('double')
  unblendedCost: number
}
