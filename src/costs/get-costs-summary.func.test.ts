// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get costs summary', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 6 }).toISO()
    const endDate = DateTime.utc().toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-costs-summary',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        startDate,
        endDate,
      }),
    }).promise()

    const { costsPerStack, costsPerService } = JSON.parse(response.Payload!.toString())

    expect(costsPerStack.length).toBe(7)
    expect(costsPerService.length).toBe(7)

    for (const dataPoint of costsPerStack) {
      expect(dataPoint.dateTime).toEqual(expect.any(String))
      expect(dataPoint.total).toEqual(expect.any(Number))
      expect(dataPoint.stackCosts).toBeTruthy()
      for (const service of dataPoint.stackCosts) {
        expect(service.stackName).toEqual(expect.any(String))
        expect(service.date).toEqual(expect.any(String))
        expect(service.unblendedCost).toEqual(expect.any(Number))
      }
    }

    for (const dataPoint of costsPerService) {
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
