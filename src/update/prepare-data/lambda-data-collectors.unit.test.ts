/* eslint-disable import/first */

process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

import { sumBy } from 'lodash'

import { expectDataToBeConsistent } from './common-test'
import { getConnection } from '../../db/db'
import {
  getMostErrorsLambdas,
  getMostInvokedLambdas,
  getSlowestLambdas,
  getTotals,
  getMostExpensiveLambdas,
} from './lambda-data-collectors'

describe('lambda collectors', () => {
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
        runtime: expect.any(String),
        size: expect.any(Number),
        timeout: expect.any(Number),
        codeSize: expect.any(String),
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
        runtime: expect.any(String),
        size: expect.any(Number),
        timeout: expect.any(Number),
        codeSize: expect.any(String),
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

  test('most invoked lambdas', async () => {
    const lambdas = await getMostInvokedLambdas('emarketeer', 1)

    expectDataToBeConsistent(lambdas, ['invocations'], 1, 'lambdaName')
  })

  test('most invoked lambdas - 30 days', async () => {
    const lambdas = await getMostInvokedLambdas('emarketeer', 30, true)

    expect(lambdas).toBeTruthy()

    expectDataToBeConsistent(lambdas, ['invocations'], 30, 'lambdaName')
  })

  test('most errors lambdas', async () => {
    const lambdas = await getMostErrorsLambdas('emarketeer', 1)

    expectDataToBeConsistent(lambdas, ['errors'], 1, 'lambdaName')
  })

  test('most errors lambdas - 30 days', async () => {
    const lambdas = await getMostErrorsLambdas('emarketeer', 30, true)

    expectDataToBeConsistent(lambdas, ['errors'], 30, 'lambdaName')
  })

  test('most expensive lambdas', async () => {
    const lambdas = await getMostExpensiveLambdas('emarketeer', 1)

    expectDataToBeConsistent(lambdas, ['cost'], 1, 'lambdaName', Number)
  })

  test('most expensive lambdas - 30 days', async () => {
    const lambdas = await getMostExpensiveLambdas('emarketeer', 30, true)

    expectDataToBeConsistent(lambdas, ['cost'], 30, 'lambdaName', Number)
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
