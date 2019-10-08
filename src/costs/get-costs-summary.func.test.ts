// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get costs summary', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.local().startOf('day').minus({ days: 6 }).toISO()
    const endDate = DateTime.local().endOf('day').toISO()

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-costs-summary',
      Payload: JSON.stringify({
        tenantId: 'f2771702-164d-4d90-bb79-b849f59918e5',
        startDate,
        endDate,
      }),
    }).promise()

    const { costsPerStack, costsPerService } = JSON.parse(response.Payload!.toString())

    expect(costsPerStack.length).toBe(6)
    expect(costsPerService.length).toBe(6)

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

  test('should handle local dates', async () => {
    const startDate = '2019-09-04T00:00:00.000+02:00'
    const endDate = '2019-09-10T23:59:59.999+02:00'

    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-costs-summary',
      Payload: JSON.stringify({
        tenantId: 'f2771702-164d-4d90-bb79-b849f59918e5',
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
