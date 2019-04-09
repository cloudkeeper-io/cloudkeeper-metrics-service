import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('LambdaConfiguration')
export class LambdaConfiguration {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tenantId: string

  @PrimaryColumn({ type: 'varchar', length: 64 })
  name: string

  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column({ type: 'varchar', length: 64 })
  runtime: string

  @Column('bigint')
  codeSize: number

  @Column('smallint')
  timeout: number

  @Column('smallint')
  size: number
}
