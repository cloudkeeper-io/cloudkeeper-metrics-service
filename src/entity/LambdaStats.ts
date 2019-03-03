import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('LambdaStats')
export class LambdaStats {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 64 })
  lambdaName: string

  @PrimaryColumn({ type: 'datetime' })
  dateTime: Date

  @Column('bigint')
  invocations: number

  @Column('bigint')
  errors: number

  @Column('double')
  maxDuration: number

  @Column('double')
  averageDuration: number
}
