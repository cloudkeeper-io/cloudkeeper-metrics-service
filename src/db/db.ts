import { createConnection } from 'typeorm'
import { memoize, map } from 'lodash'
import { AuroraDataApiConnectionOptions } from 'typeorm/driver/aurora-data-api/AuroraDataApiConnectionOptions'

import * as entities from '../entity'

export const config: AuroraDataApiConnectionOptions = {
  type: 'aurora-data-api',
  host: process.env.dbHost,
  port: 3306,
  database: process.env.dbName!,
  secretArn: process.env.dbSecretArn!,
  resourceArn: process.env.dbResourceArn!,
  region: process.env.dbRegion!,
  // @ts-ignore
  entities: [
    ...map(entities),
  ],
  logging: false,
  synchronize: false,
  logger: 'simple-console',
}

export const getConnection = memoize(async () => createConnection(config))
