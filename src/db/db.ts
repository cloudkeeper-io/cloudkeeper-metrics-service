import { createConnection } from 'typeorm'
import { memoize, map } from 'lodash'
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'

import * as entities from '../entity'

export const config: MysqlConnectionOptions = {
  type: 'mysql',
  host: process.env.dbHost,
  port: 3306,
  username: process.env.dbUser,
  password: process.env.dbPassword,
  database: process.env.dbName,
  // @ts-ignore
  entities: [
    ...map(entities),
  ],
  logging: true,
  synchronize: true,
  extra: {
    connectionLimit: 1,
  },
}

export const getConnection = memoize(async () => createConnection(config))
