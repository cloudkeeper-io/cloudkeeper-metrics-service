// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })
const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'eu-central-1' })


describe('create tenant', () => {
  jest.setTimeout(30000)

  beforeAll(async () => {
    await dynamoDb.put({
      TableName: 'dev-users',
      Item: {
        provider: 'funcTest',
        id: 'test@test.com',
        tenantIds: [],
      },
    }).promise()
  })

  let tenantId

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-create-tenant',
      Payload: JSON.stringify({
        userId: 'test@test.com',
        provider: 'funcTest',
        name: 'test tenant',
        accessKey: 'AKIAIL5SDDNRS6QSDEUQ',
        secretKey: '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',
        region: 'eu-central-1',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    tenantId = payload.id

    expect(payload.id).toEqual(expect.any(String))
    expect(payload.name).toBe('test tenant')
    expect(payload.isSetupCompleted).toBe(true)
  })

  afterAll(async () => {
    await dynamoDb.delete({
      Key: {
        provider: 'funcTest',
        id: 'test@test.com',
      },
      TableName: 'dev-users',
    }).promise()

    await dynamoDb.delete({
      Key: {
        id: tenantId,
      },
      TableName: 'dev-cloudkeeper-tenants',
    }).promise()
  })
})
