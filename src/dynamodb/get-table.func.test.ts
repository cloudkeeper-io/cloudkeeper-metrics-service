// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get dynamo table details', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-dynamo-table',
      Payload: JSON.stringify({
        tenantId: 'f2771702-164d-4d90-bb79-b849f59918e5',
        name: 'dev-consents',
        region: 'eu-west-1',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload).toEqual({
      name: expect.any(String),
      region: expect.any(String),
      sizeBytes: expect.any(String),
      tenantId: expect.any(String),
      items: expect.any(String),
      billingMode: expect.any(String),
    })
  })
})
