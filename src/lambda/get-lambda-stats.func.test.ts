// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get lambda stats', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 1 }).toISO()
    const endDate = DateTime.utc().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-lambda-stats',
      Payload: JSON.stringify({
        tenantId: '839c5d7e-5c15-49ae-b4d6-6bbdf161d9e2',
        name: 'dev-crm-service-tenant-retry-queue-poller',
        region: 'eu-west-1',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.averageDuration).toEqual(expect.any(Number))
    expect(payload.totalErrors).toEqual(expect.any(Number))
    expect(payload.totalInvocations).toEqual(expect.any(Number))
    expect(payload.dataPoints.length).toBe(24)

    for (const dataPoint of payload.dataPoints) {
      expect(dataPoint.averageDuration).toEqual(expect.any(Number))
      expect(dataPoint.errors).toBeDefined()
      expect(dataPoint.invocations).toBeDefined()
      expect(dataPoint.dateTime).toEqual(expect.any(String))
    }
  })
})
