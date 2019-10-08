// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get events', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 7 }).toISO()
    const endDate = DateTime.utc().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-events',
      Payload: JSON.stringify({
        tenantId: 'f2771702-164d-4d90-bb79-b849f59918e5',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.length).toBe(20)

    for (const event of payload) {
      expect(event.serviceName).toEqual(expect.any(String))
      expect(event.message).toEqual(expect.any(String))
    }
  })
})
