// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })
const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'eu-central-1' })

describe('create tenant', () => {
  jest.setTimeout(30000)

  const tenants = [{
    tenantId: 'test1',
    name: 'test tenant 1',
    isSetupCompleted: false,
    accessKey: 'test key',
    secretKey: 'test key',
    owner: {
      id: 'user test id',
      provider: 'local',
    },
  }, {
    tenantId: 'test2',
    name: 'test tenant 2',
    isSetupCompleted: false,
    accessKey: 'test key',
    secretKey: 'test key',
    owner: {
      id: 'user test id',
      provider: 'local',
    },
  }]

  beforeAll(async () => {
    for (const tenant of tenants) {
      await dynamoDb.put({
        TableName: 'dev-cloudkeeper-tenants',
        Item: tenant,
      }).promise()
    }
  })

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-list-tenants',
      Payload: JSON.stringify({
        tenantIds: ['test1', 'test2'],
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.length).toEqual(2)
  })

  afterAll(async () => {
    for (const tenant of tenants) {
      await dynamoDb.delete({
        TableName: 'dev-cloudkeeper-tenants',
        Key: {
          tenantId: tenant.tenantId,
        },
      }).promise()
    }
  })
})
