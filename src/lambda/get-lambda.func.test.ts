// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('get lambda details', () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-get-lambda',
      Payload: JSON.stringify({
        tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
        name: 'company-service-dev-get-companies-by-id',
        region: 'eu-west-1',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload).toEqual({
      name: expect.any(String),
      region: expect.any(String),
      runtime: expect.any(String),
      timeout: expect.any(Number),
      size: expect.any(Number),
      codeSize: expect.any(Number),
      tenantId: expect.any(String),
    })
  })
})
