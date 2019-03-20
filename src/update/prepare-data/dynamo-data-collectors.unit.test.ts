/* eslint-disable import/first */
process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { expectDataToBeConsistent } from './common-test'
import { getMostReadTables } from './dynamo-data-collectors'
import { getConnection } from '../../db/db'


describe('dynamo collectors', () => {
  jest.setTimeout(30000)

  test('most read tables', async () => {
    const tables = await getMostReadTables('emarketeer', 1)

    expectDataToBeConsistent(tables, 'readUnits', 1, 'name')
  })

  test('most read tables', async () => {
    const tables = await getMostReadTables('emarketeer', 30, true)

    expectDataToBeConsistent(tables, 'readUnits', 30, 'name')
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
