/* eslint-disable import/first */
process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { sumBy } from 'lodash'
import { getConnection } from '../../db/db'
import {
  getMostErrorsLambdas,
  getMostInvokedLambdas,
  getSlowestLambdas,
  getTotals,
  getMostExpensiveLambdas,
} from './data-collectors'

describe('collectors', () => {
  jest.setTimeout(30000)

  it.each`
    tenantId        | daysAgo | groupDaily
    ${'emarketeer'} | ${1}    | ${false}
    ${'emarketeer'} | ${30}   | ${true}
  `('totals  - $daysAgo',
  async ({ tenantId, daysAgo, groupDaily }) => {
    const totals = await getTotals(tenantId, daysAgo, groupDaily)

    expect(totals.invocations).toBeTruthy()
    expect(totals.errors).toBeTruthy()
    expect(totals.cost).toBeTruthy()
    expect(totals.dataPoints.length).toBe(daysAgo > 1 ? daysAgo : 24)
    // @ts-ignore
    expect(Number(totals.errors)).toBe(sumBy(totals.dataPoints, dataPoint => Number(dataPoint.errors)))
    // @ts-ignore
    expect(Number(totals.invocations)).toBe(sumBy(totals.dataPoints, dataPoint => Number(dataPoint.invocations)))
    // @ts-ignore
    expect(Number(totals.cost)).toBeCloseTo(sumBy(totals.dataPoints, dataPoint => Number(dataPoint.cost)))
  })

  test('slowest lambdas', async () => {
    const lambdas = await getSlowestLambdas('emarketeer', 1)

    expect(lambdas).toBeTruthy()

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        averageDuration: expect.any(Number),
        dataPoints: expect.any(Array),
      })

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          averageDuration: expect.any(Number),
          dateTime: expect.any(Date),
          maxDuration: expect.any(Number),
          lambdaName: expect.any(String),
        })
      })
    })
  })

  test('slowest lambdas 30 days', async () => {
    const lambdas = await getSlowestLambdas('emarketeer', 30, true)

    expect(lambdas).toBeTruthy()
    expect(lambdas.length).toBe(5)

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        averageDuration: expect.any(Number),
        dataPoints: expect.any(Array),
      })

      expect(lambda.dataPoints.length).toBeLessThanOrEqual(30)

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          averageDuration: expect.any(Number),
          dateTime: expect.any(Date),
          maxDuration: expect.any(Number),
          lambdaName: expect.any(String),
        })
      })
    })
  })

  const expectLambdaStatsToBeConsistent = (lambdas, statName, days, statType: any = String) => {
    expect(lambdas).toBeTruthy()

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        [statName]: expect.any(statType),
        dataPoints: expect.any(Array),
      })

      if (days > 1) {
        expect(lambda.dataPoints.length).toBeLessThanOrEqual(days)
      } else {
        expect(lambda.dataPoints.length).toBeLessThanOrEqual(24)
      }

      // @ts-ignore
      expect(Number(lambda[statName])).toBeCloseTo(sumBy(lambda.dataPoints, dataPoint => Number(dataPoint[statName])))

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          dateTime: expect.any(Date),
          [statName]: expect.any(statType),
          lambdaName: expect.any(String),
        })
      })
    })
  }

  test('most invoked lambdas', async () => {
    const lambdas = await getMostInvokedLambdas('emarketeer', 1)

    expectLambdaStatsToBeConsistent(lambdas, 'invocations', 1)
  })

  test('most invoked lambdas - 30 days', async () => {
    const lambdas = await getMostInvokedLambdas('emarketeer', 30, true)

    expect(lambdas).toBeTruthy()

    expectLambdaStatsToBeConsistent(lambdas, 'invocations', 30)
  })

  test('most errors lambdas', async () => {
    const lambdas = await getMostErrorsLambdas('emarketeer', 1)

    expectLambdaStatsToBeConsistent(lambdas, 'errors', 1)
  })

  test('most errors lambdas - 30 days', async () => {
    const lambdas = await getMostErrorsLambdas('emarketeer', 30, true)

    expectLambdaStatsToBeConsistent(lambdas, 'errors', 30)
  })

  test('most expensive lambdas', async () => {
    const lambdas = await getMostExpensiveLambdas('emarketeer', 1)

    expectLambdaStatsToBeConsistent(lambdas, 'cost', 1, Number)
  })

  test('most expensive lambdas - 30 days', async () => {
    const lambdas = await getMostExpensiveLambdas('emarketeer', 30, true)

    expectLambdaStatsToBeConsistent(lambdas, 'cost', 30, Number)
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})