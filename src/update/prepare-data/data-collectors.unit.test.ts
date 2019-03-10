process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

// eslint-disable-next-line import/first
import { getConnection } from '../../db/db'
// eslint-disable-next-line import/first
import { getMostErrorsLambdas, getMostInvokedLambdas, getSlowestLambdas, getTotals } from './data-collectors'

describe('collectors', () => {
  jest.setTimeout(30000)

  test('totals', async () => {
    const totals = await getTotals('emarketeer', 1)

    expect(totals.invocations).toBeTruthy()
    expect(totals.errors).toBeTruthy()
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


  test('most invoked lambdas', async () => {
    const lambdas = await getMostInvokedLambdas('emarketeer', 1)

    expect(lambdas).toBeTruthy()

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        invocations: expect.any(String),
        dataPoints: expect.any(Array),
      })

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          dateTime: expect.any(Date),
          invocations: expect.any(String),
          lambdaName: expect.any(String),
        })
      })
    })
  })

  test('most errors lambdas', async () => {
    const lambdas = await getMostErrorsLambdas('emarketeer', 1)

    expect(lambdas).toBeTruthy()

    lambdas.forEach((lambda) => {
      expect(lambda).toEqual({
        lambdaName: expect.any(String),
        errors: expect.any(String),
        dataPoints: expect.any(Array),
      })

      lambda.dataPoints.forEach((dataPoint) => {
        expect(dataPoint).toEqual({
          errors: expect.any(String),
          dateTime: expect.any(Date),
          lambdaName: expect.any(String),
        })
      })
    })
  })


  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
