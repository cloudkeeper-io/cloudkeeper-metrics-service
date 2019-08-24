// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get lambda totals', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.local().minus({ days: 7 }).toUTC().toISO()
    const endDate = DateTime.local().toUTC().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-lambda-totals',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.invocations).toEqual(expect.any(Number))
    expect(payload.errors).toEqual(expect.any(Number))

    expect(payload.dataPoints.length).toBe(168)

    for (const event of payload.dataPoints) {
      expect(event.invocations).toEqual(expect.any(String))
      expect(event.errors).toEqual(expect.any(String))
      expect(event.dateTime).toEqual(expect.any(String))
    }
  })
})
