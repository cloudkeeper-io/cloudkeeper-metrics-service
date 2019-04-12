import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { map } from 'lodash'
import { createConnection } from 'typeorm'
import * as AWS from 'aws-sdk'
import * as entities from '../src/entity'

const ssm = new AWS.SSM({ region: 'eu-central-1' })

async function getParameter(name) {
  return (await ssm.getParameter({
    Name: name,
  }).promise()).Parameter!.Value
}

const getConfig = async (): Promise<MysqlConnectionOptions> => {
  const stage = process.env.STAGE

  const dbName = await getParameter(`${stage}-metrics-db-name`)
  const dbHost = await getParameter(`${stage}-metrics-db-host`)
  const dbUser = await getParameter(`${stage}-metrics-db-user`)
  const dbPassword = await getParameter(`${stage}-metrics-db-password`)

  return {
    type: 'mysql',
    host: dbHost,
    port: 3306,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    // @ts-ignore
    entities: [
      ...map(entities),
    ],
    logging: false,
    synchronize: false,
    timezone: 'Z',
    migrations: ['src/db/migrations/*.ts'],
    migrationsRun: true,
    extra: {
      connectionLimit: 1,
    },
  }
}

const runMigrations = async () => {
  const config = await getConfig()
  await createConnection(config)
}

runMigrations()
