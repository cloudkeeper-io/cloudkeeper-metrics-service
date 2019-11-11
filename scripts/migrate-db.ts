import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import { map } from 'lodash'
import { createConnection } from 'typeorm'
import * as AWS from 'aws-sdk'
import * as entities from '../src/entity'

const ssm = new AWS.SSM({ region: 'eu-central-1' })

async function getParameter(name: string) {
  return (await ssm.getParameter({
    Name: name,
  }).promise()).Parameter!.Value
}

export const getConfig = async (): Promise<MysqlConnectionOptions> => {
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
    logging: true,
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
  try {
    const config = await getConfig()
    await createConnection(config)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
  process.exit(0)
}

runMigrations()
