// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('setup', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-setup-tenant',
      Payload: JSON.stringify({
        accessKey: 'AKIAJI7Y7EUA4WTJYTUA',
        secretKey: '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',
        region: 'eu-west-1',
        tenantId: 'test',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.status).toBe('SUCCESS')
    expect(payload.functions).toBe(50)
  })
})
