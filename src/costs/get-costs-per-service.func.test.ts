// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get costs per service', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 7 }).toISO()
    const endDate = DateTime.utc().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-costs-per-service',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.length).toBe(7)

    for (const dataPoint of payload) {
      expect(dataPoint.dateTime).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))
      expect(dataPoint.serviceCosts).toBeTruthy()
      for (const service of dataPoint.serviceCosts) {
        expect(service.serviceName).toEqual(expect.any(String))
        expect(service.date).toEqual(expect.any(String))
        expect(service.unblendedCost).toEqual(expect.any(Number))
      }
    }
  })
})
