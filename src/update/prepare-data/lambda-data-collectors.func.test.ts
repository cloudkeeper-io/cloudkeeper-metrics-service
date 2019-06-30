/* eslint-disable import/first */

process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'

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
    ${'7ec85367-20e1-40f2-8725-52b245354045'} | ${1}    | ${false}
    ${'7ec85367-20e1-40f2-8725-52b245354045'} | ${30}   | ${true}
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
    const lambdas = await getSlowestLambdas('7ec85367-20e1-40f2-8725-52b245354045', 1)

    expect(lambdas).toBeTruthy()

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        region: expect.any(String),
        averageDuration: expect.any(Number),
        maxDuration: expect.any(Number),
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
          region: expect.any(String),
        })
      })
    })
  })

  test('slowest lambdas 30 days', async () => {
    const lambdas = await getSlowestLambdas('7ec85367-20e1-40f2-8725-52b245354045', 30, true)

    expect(lambdas).toBeTruthy()
    expect(lambdas.length).toBe(5)

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        region: expect.any(String),
        averageDuration: expect.any(Number),
        maxDuration: expect.any(Number),
        dataPoints: expect.any(Array),
        runtime: expect.any(String),
        size: expect.any(Number),
        timeout: expect.any(Number),
        codeSize: expect.any(String),
      })

      expect(lambda.dataPoints.length).toBe(30)

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          averageDuration: expect.any(Number),
          dateTime: expect.any(Date),
          maxDuration: expect.any(Number),
          lambdaName: expect.any(String),
          region: expect.any(String),
        })
      })
    })
  })

  const expectLambdaFields = (lambdas) => {
    lambdas.forEach((lambda) => {
      expect(lambda.size).toEqual(expect.any(Number))
      expect(lambda.timeout).toEqual(expect.any(Number))
      expect(lambda.codeSize).toEqual(expect.any(String))
      expect(lambda.dataPoints).toEqual(expect.any(Array))
    })
  }

  test('most invoked lambdas', async () => {
    const lambdas = await getMostInvokedLambdas('7ec85367-20e1-40f2-8725-52b245354045', 1)

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['invocations'], 1, 'lambdaName')
  })

  test('most invoked lambdas - 30 days', async () => {
    const lambdas = await getMostInvokedLambdas('7ec85367-20e1-40f2-8725-52b245354045', 30, true)

    expect(lambdas).toBeTruthy()

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['invocations'], 30, 'lambdaName')
  })

  test('most errors lambdas', async () => {
    const lambdas = await getMostErrorsLambdas('7ec85367-20e1-40f2-8725-52b245354045', 1)

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['errors'], 1, 'lambdaName')
  })

  test('most errors lambdas - 30 days', async () => {
    const lambdas = await getMostErrorsLambdas('7ec85367-20e1-40f2-8725-52b245354045', 30, true)

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['errors'], 30, 'lambdaName')
  })

  test('most expensive lambdas', async () => {
    const lambdas = await getMostExpensiveLambdas('7ec85367-20e1-40f2-8725-52b245354045', 1)

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['cost'], 1, 'lambdaName', Number)
  })

  test('most expensive lambdas - 30 days', async () => {
    const lambdas = await getMostExpensiveLambdas('7ec85367-20e1-40f2-8725-52b245354045', 30, true)

    expectLambdaFields(lambdas)

    expectDataToBeConsistent(lambdas, ['cost'], 30, 'lambdaName', Number)
  })

  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
