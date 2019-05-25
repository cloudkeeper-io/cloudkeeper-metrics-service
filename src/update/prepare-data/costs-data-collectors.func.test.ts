import { DateTime } from 'luxon'
/* eslint-disable import/first */

process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { getConnection } from '../../db/db'
import { getCostsForService, getCostsPerService, getCostsPerStack } from './costs-data-collectors'

describe('costs collectors', () => {
  jest.setTimeout(30000)

  const endDate = DateTime.utc().minus({ days: 1 }).startOf('second').toISODate()

  const startDate = DateTime.utc().minus({ days: 90 }).startOf('second').toISODate()

  const startDate180 = DateTime.utc().minus({ days: 180 }).startOf('second').toISODate()

  test('costs per service', async () => {
    const dataPoints = await getCostsPerService('7ec85367-20e1-40f2-8725-52b245354045', startDate, endDate)

    expect(dataPoints.length).toBe(90)

    dataPoints.forEach((dataPoint) => {
      expect(dataPoint.date).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))

      dataPoint.serviceCosts.forEach((row) => {
        expect(row).toEqual({
          date: expect.any(String),
          serviceName: expect.any(String),
          blendedCost: expect.any(Number),
        })
      })
    })
  })

  test('costs per service - 180 days', async () => {
    const dataPoints = await getCostsPerService('7ec85367-20e1-40f2-8725-52b245354045', startDate180, endDate)

    expect(dataPoints.length).toBe(180)

    dataPoints.forEach((dataPoint) => {
      expect(dataPoint.date).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))

      dataPoint.serviceCosts.forEach((row) => {
        expect(row).toEqual({
          date: expect.any(String),
          serviceName: expect.any(String),
          blendedCost: expect.any(Number),
        })
      })
    })
  })

  test('costs for service', async () => {
    const dataPoints = await getCostsForService(
      '7ec85367-20e1-40f2-8725-52b245354045',
      'Amazon Relational Database Service',
      startDate,
      endDate,
    )

    expect(dataPoints.length).toBe(90)

    dataPoints.forEach((dataPoint) => {
      expect(dataPoint.dateTime).toEqual(expect.any(Date))
      expect(dataPoint.cost).toEqual(expect.any(Number))
    })
  })

  test('costs per stack', async () => {
    const dataPoints = await getCostsPerStack('7ec85367-20e1-40f2-8725-52b245354045', startDate, endDate)

    expect(dataPoints.length).toBe(90)

    dataPoints.forEach((dataPoint) => {
      expect(dataPoint.date).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))

      dataPoint.stackCosts.forEach((row) => {
        expect(row).toEqual({
          date: expect.any(String),
          stackName: expect.any(String),
          blendedCost: expect.any(Number),
        })
      })
    })
  })


  test('costs per stack - 180', async () => {
    const dataPoints = await getCostsPerStack('7ec85367-20e1-40f2-8725-52b245354045', startDate180, endDate)

    expect(dataPoints.length).toBe(180)

    dataPoints.forEach((dataPoint) => {
      expect(dataPoint.date).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))

      dataPoint.stackCosts.forEach((row) => {
        expect(row).toEqual({
          date: expect.any(String),
          stackName: expect.any(String),
          blendedCost: expect.any(Number),
        })
      })
    })
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
