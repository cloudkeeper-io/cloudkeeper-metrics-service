
process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

// eslint-disable-next-line import/first
import { getConnection } from '../../db/db'
// eslint-disable-next-line import/first
import { getTotals, getSlowestLambdas } from './data-collectors'

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


  afterAll(async () => {
    const connection = await getConnection()
    await connection.close()
  })
})
