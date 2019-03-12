import * as uuid from 'uuidv4'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  const tenant = {
    tenantId: uuid(),
    owner: {
      id: request.userId,
      provider: request.provider,
    },
    name: request.name,
    isSetupCompleted: false,
  }

  await dynamoDb.put({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
    Item: tenant,
  }).promise()

  const updateResult = await dynamoDb.update({
    TableName: `${process.env.stage}-users`,
    Key: {
      id: request.userId,
      provider: request.provider,
    },
    UpdateExpression: 'SET tenantIds = list_append(tenantIds,:tenantId)',
    ExpressionAttributeValues: {
      ':tenantId': [tenant.tenantId],
    },
  }).promise()

  console.log('Update result', updateResult)

  return tenant
}
