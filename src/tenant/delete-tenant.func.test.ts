// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })
const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'eu-central-1' })

describe('create tenant', () => {
  jest.setTimeout(30000)

  const tenant = {
    id: 'testDeleteTenant',
    name: 'test tenant 1',
    isSetupCompleted: false,
    accessKey: 'test key',
    secretKey: 'test key',
    owner: {
      id: 'userId',
      provider: 'functional-test',
    },
  }

  beforeAll(async () => {
    await dynamoDb.put({
      TableName: 'dev-cloudkeeper-tenants',
      Item: tenant,
    }).promise()

    await dynamoDb.put({
      TableName: 'dev-cloudkeeper-tenant-users',
      Item: {
        userId: 'functional-test|userId',
        tenantId: tenant.id,
      },
    }).promise()
  })

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-delete-tenant',
      Payload: JSON.stringify({
        provider: 'functional-test',
        userId: 'userId',
        tenantId: tenant.id,
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload).toBeTruthy()

    const tenantResponse = await dynamoDb.get({
      TableName: 'dev-cloudkeeper-tenants',
      Key: {
        id: tenant.id,
      },
    }).promise()

    expect(tenantResponse.Item).toBeFalsy()

    const accessRow = await dynamoDb.get({
      TableName: 'dev-cloudkeeper-tenant-users',
      Key: {
        userId: 'functional-test|userId',
        tenantId: tenant.id,
      },
    }).promise()

    expect(accessRow.Item).toBeFalsy()
  })
})
