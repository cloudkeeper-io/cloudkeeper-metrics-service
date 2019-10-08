// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get lambda totals', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.local().minus({ days: 6 }).startOf('day').toISO({ includeOffset: true })
    const endDate = DateTime.local().toISO({ includeOffset: true })

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
    expect(payload.cost).toEqual(expect.any(Number))

    expect(payload.dataPoints.length).toBe(7)

    for (const dataPoint of payload.dataPoints) {
      expect(dataPoint.invocations).toEqual(expect.any(Number))
      expect(dataPoint.errors).toEqual(expect.any(Number))
      expect(dataPoint.cost).toEqual(expect.any(Number))
      expect(dataPoint.dateTime).toEqual(expect.any(String))
    }
  })


  test('one day should be correct', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-lambda-totals',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        startDate: '2019-09-10T00:00:00.000+02:00',
        endDate: '2019-09-10T23:59:59.999+02:00',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.invocations).toEqual(expect.any(Number))
    expect(payload.errors).toEqual(expect.any(Number))
    expect(payload.cost).toEqual(expect.any(Number))

    expect(payload.dataPoints.length).toBe(24)

    for (const dataPoint of payload.dataPoints) {
      expect(dataPoint.invocations).toEqual(expect.any(Number))
      expect(dataPoint.errors).toEqual(expect.any(Number))
      expect(dataPoint.cost).toEqual(expect.any(Number))
      expect(dataPoint.dateTime).toEqual(expect.any(String))
    }
  })
})
