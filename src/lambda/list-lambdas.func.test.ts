// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('list lambdas', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const startDate = DateTime.utc().minus({ days: 1 }).toISO()
    const endDate = DateTime.utc().toISO()
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-list-lambdas',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        startDate,
        endDate,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.length).toBeGreaterThan(0)

    for (const lambda of payload) {
      expect(lambda).toEqual({
        tenantId: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        runtime: expect.any(String),
        size: expect.any(Number),
        codeSize: expect.any(Number),
        timeout: expect.any(Number),
        avgExecutionTime: expect.any(Number),
        invocations: expect.any(String),
        errors: expect.any(String),
        errorRate: expect.any(String),
        cost: expect.any(Number),
      })
    }
  })
})
