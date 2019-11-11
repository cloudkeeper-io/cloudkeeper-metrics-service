import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('LambdaPrice')
export class LambdaPrice {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  region: string

  @Column('double')
  pricePerGbSeconds: number

  @Column('double')
  requestPrice: number
}
