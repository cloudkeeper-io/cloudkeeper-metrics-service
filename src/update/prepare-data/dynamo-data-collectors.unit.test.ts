/* eslint-disable import/first */
process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { expectDataToBeConsistent } from './common-test'
import { getMostReadTables, getMostThrottledTables, getMostWritesTables } from './dynamo-data-collectors'
import { getConnection } from '../../db/db'


describe('dynamo collectors', () => {
  jest.setTimeout(30000)

  test('most read tables - 24 hours', async () => {
    const tables = await getMostReadTables('emarketeer', 1)

    expectDataToBeConsistent(tables, ['consumedRead', 'provisionedRead'], 1, 'name')
  })

  test('most read tables - 30 days', async () => {
    const tables = await getMostReadTables('emarketeer', 30, true)

    expectDataToBeConsistent(tables, ['consumedRead', 'provisionedRead'], 30, 'name')
  })

  test('most writes tables - 24 hours', async () => {
    const tables = await getMostWritesTables('emarketeer', 1)

    expectDataToBeConsistent(tables, ['consumedWrite', 'provisionedWrite'], 1, 'name')
  })

  test('most writes tables - 30 days', async () => {
    const tables = await getMostWritesTables('emarketeer', 30, true)

    expectDataToBeConsistent(tables, ['consumedWrite', 'provisionedWrite'], 30, 'name')
  })

  test('most throttled tables - 24 hours', async () => {
    const tables = await getMostThrottledTables('4eab2bfc-8e8f-49e0-b12c-7a3773007368', 1)

    expectDataToBeConsistent(tables, ['throttledRequests'], 1, 'name')
  })

  test('most throttled tables - 30 days', async () => {
    const tables = await getMostThrottledTables('4eab2bfc-8e8f-49e0-b12c-7a3773007368', 30, true)

    expectDataToBeConsistent(tables, ['throttledRequests'], 30, 'name')
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
