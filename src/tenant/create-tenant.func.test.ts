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
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    tenantId = payload.id

    expect(payload.id).toEqual(expect.any(String))
    expect(payload.name).toBe('test tenant')
    expect(payload.isSetupCompleted).toBe(false)
  })

  test('create tenant with the same name twice', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-create-tenant',
      Payload: JSON.stringify({
        userId: 'test@test.com',
        provider: 'funcTest',
        name: 'test tenant',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    tenantId = payload.id

    expect(payload.id).toEqual(expect.any(String))
    expect(payload.name).toBe('test tenant')
    expect(payload.isSetupCompleted).toBe(false)

    const response2 = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-create-tenant',
      Payload: JSON.stringify({
        userId: 'test@test.com',
        provider: 'funcTest',
        name: 'test tenant',
      }),
    }).promise()

    const payload2 = JSON.parse(response2.Payload!.toString())

    expect(payload2.errorMessage).toBe('Tenant name must be unique')
  })

  afterEach(async () => {
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
