// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

process.env.stage = 'dev'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'eu-central-1' })
const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })

describe('setup', () => {
  jest.setTimeout(30000)

  beforeAll(async () => {
    await dynamoDb.put({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Item: {
        id: 'func-test-setup-tenant',
        owner: {
          id: 'test@test.com',
          provider: 'func-test',
        },
        name: 'test-tenant',
        isSetupCompleted: false,
        createdAt: new Date().getTime(),
      },
    }).promise()
  })

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-setup-tenant',
      Payload: JSON.stringify({
        userId: 'test@test.com',
        provider: 'func-test',
        region: 'eu-central-1',
        tenantId: 'func-test-setup-tenant',
        roleArn: 'arn:aws:iam::537011205135:role/CloudkeeperDelegationRole',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    expect(payload.status).toBe('SUCCESS')
    expect(payload.functions).toEqual(expect.any(Number))

    const databaseTenant = (await dynamoDb.get({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Key: {
        id: 'func-test-setup-tenant',
      },
    }).promise()).Item

    expect(databaseTenant).toBeTruthy()
  })

  afterAll(async () => {
    await dynamoDb.delete({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Key: {
        id: 'func-test-setup-tenant',
      },
    }).promise()
  })
})
