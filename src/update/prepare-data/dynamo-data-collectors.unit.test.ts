/* eslint-disable import/first */
process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { sumBy } from 'lodash'
import { expectDataToBeConsistent } from './common-test'
import {
  getMostExpensiveTables,
  getMostReadTables,
  getMostThrottledTables,
  getMostWritesTables,
} from './dynamo-data-collectors'
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

    expectDataToBeConsistent(tables, ['throttledRequests', 'throttledReads', 'throttledWrites'], 1, 'name')
  })

  test('most throttled tables - 30 days', async () => {
    const tables = await getMostThrottledTables('4eab2bfc-8e8f-49e0-b12c-7a3773007368', 30, true)

    expectDataToBeConsistent(tables, ['throttledRequests', 'throttledReads', 'throttledWrites'], 30, 'name')
  })

  const expectDynamoExpensiveData = (table, entity) => {
    expect(entity.totalPrice).toEqual(expect.any(Number))
    expect(entity.readPrice).toEqual(expect.any(Number))
    expect(entity.writePrice).toEqual(expect.any(Number))
    expect(entity.storagePrice).toEqual(expect.any(Number))
    expect(entity.sizeBytes).toEqual(expect.any(String))
    expect(entity.billingMode).toEqual(expect.any(String))

    if (table.billingMode === 'PROVISIONED') {
      expect(entity.averageReadProvisioned).toEqual(expect.any(String))
      expect(entity.averageWriteProvisioned).toEqual(expect.any(String))
    } else {
      expect(entity.consumedWriteCapacity).toEqual(expect.any(String))
      expect(entity.consumedReadCapacity).toEqual(expect.any(String))
    }
  }

  const expectExpensiveDataToBeConsistent = (tables, dataPointsNumber) => {
    tables.forEach((table) => {
      expect(table.name).toEqual(expect.any(String))
      expect(table.dataPoints).toEqual(expect.any(Array))

      expectDynamoExpensiveData(table, table)

      expect(table.dataPoints.length).toBeLessThanOrEqual(dataPointsNumber)

      table.dataPoints.forEach((dataPoint) => {
        expectDynamoExpensiveData(table, dataPoint)
        expect(dataPoint.dateTime).toEqual(expect.any(Date))
      })

      expect(Number(table.storagePrice)).toBeCloseTo(
        // @ts-ignore
        sumBy(table.dataPoints, dataPoint => Number(dataPoint.storagePrice)),
      )
      // @ts-ignore
      expect(Number(table.writePrice)).toBeCloseTo(sumBy(table.dataPoints, dataPoint => Number(dataPoint.writePrice)))
      // @ts-ignore
      expect(Number(table.readPrice)).toBeCloseTo(sumBy(table.dataPoints, dataPoint => Number(dataPoint.readPrice)))
      // @ts-ignore
      expect(Number(table.totalPrice)).toBeCloseTo(sumBy(table.dataPoints, dataPoint => Number(dataPoint.totalPrice)))
    })
  }

  test('most expensive tables - 24 hours', async () => {
    const tables = await getMostExpensiveTables('4eab2bfc-8e8f-49e0-b12c-7a3773007368', 'eu-west-1', 1)

    expectExpensiveDataToBeConsistent(tables, 24)
  })

  test('most expensive tables - 30 days', async () => {
    const tables = await getMostExpensiveTables('4eab2bfc-8e8f-49e0-b12c-7a3773007368', 'eu-west-1', 30, true)

    expect(tables).toBeTruthy()

    expectExpensiveDataToBeConsistent(tables, 30)
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
