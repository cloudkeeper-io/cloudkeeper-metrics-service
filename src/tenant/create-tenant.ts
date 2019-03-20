import * as uuid from 'uuidv4'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { checkAccess } from '../utils/lambda.util'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  const { accessKey, secretKey, region } = request

  try {
    await checkAccess(accessKey, secretKey, region)
  } catch (err) {
    console.log('error setting up access for tenant ', err)
    return {
      status: 'FAILED',
    }
  }

  const tenant = {
    id: uuid(),
    owner: {
      id: request.userId,
      provider: request.provider,
    },
    name: request.name,
    isSetupCompleted: true,
    accessKey,
    secretKey,
    region,
  }

  await dynamoDb.put({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
    Item: tenant,
  }).promise()

  await dynamoDb.put({
    TableName: `${process.env.stage}-cloudkeeper-tenant-users`,
    Item: {
      userId: `${request.provider}|${request.userId}`,
      tenantId: tenant.id,
    },
  }).promise()

  return tenant
}
