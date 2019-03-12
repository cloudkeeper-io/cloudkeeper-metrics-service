// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const lambdaClient = new AWS.Lambda({ region: 'eu-central-1' })
const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'eu-central-1' })


describe('create tenant', () => {
  jest.setTimeout(30000)

  let tenantId

  test('happy path', async () => {
    const response = await lambdaClient.invoke({
      FunctionName: 'cloudkeeper-metrics-service-dev-create-tenant',
      Payload: JSON.stringify({
        userId: 'testnew@test.com',
        provider: 'local',
        name: 'test tenant',
      }),
    }).promise()

    const payload = JSON.parse(response.Payload!.toString())

    tenantId = payload.tenantId

    expect(payload.tenantId).toEqual(expect.any(String))
    expect(payload.name).toBe('test tenant')
    expect(payload.setupComplete).toBe(false)
  })

  afterAll(async () => {
    dynamoDb.delete({
      Key: tenantId,
      TableName: 'dev-cloudkeeper-tenants',
    })
  })
})
