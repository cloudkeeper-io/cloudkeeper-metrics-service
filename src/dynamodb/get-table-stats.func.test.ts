// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get dynamo table stats', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 1 }).toISO()
    const endDate = DateTime.utc().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-dynamo-table-stats',
      Payload: JSON.stringify({
        tenantId: 'f2771702-164d-4d90-bb79-b849f59918e5',
        name: 'dev-tenant',
        region: 'eu-west-1',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.totalConsumedRead).toEqual(expect.any(Number))
    expect(payload.totalConsumedWrite).toEqual(expect.any(Number))
    expect(payload.totalProvisionedRead).toEqual(expect.any(Number))
    expect(payload.totalProvisionedWrite).toEqual(expect.any(Number))
    expect(payload.totalThrottledReads).toEqual(expect.any(Number))
    expect(payload.totalThrottledWrites).toEqual(expect.any(Number))
    expect(payload.dataPoints.length).toBe(24)

    for (const dataPoint of payload.dataPoints) {
      expect(dataPoint.consumedRead).toEqual(expect.any(String))
      expect(dataPoint.consumedWrite).toEqual(expect.any(String))
      expect(dataPoint.provisionedRead).toEqual(expect.any(String))
      expect(dataPoint.provisionedWrite).toEqual(expect.any(String))
      expect(dataPoint.throttledReads).toEqual(expect.any(String))
      expect(dataPoint.throttledWrites).toEqual(expect.any(String))
      expect(dataPoint.dateTime).toEqual(expect.any(String))
    }
  })
})
