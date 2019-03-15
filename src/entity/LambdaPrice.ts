import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('LambdaPrice')
export class LambdaPrice {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  size: string

  @Column('double')
  price: number
}
