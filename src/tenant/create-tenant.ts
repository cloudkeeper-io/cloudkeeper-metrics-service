import * as uuid from 'uuidv4'
import * as AWS from 'aws-sdk'
import * as Lambda from 'aws-sdk/clients/lambda'

import { checkAccess } from '../utils/lambda.util'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (request) => {
  const { accessKey, secretKey, region } = request

  try {
    await checkAccess(accessKey, secretKey, region)
  } catch (err) {
    console.log('error setting up access for tenant ', err)
    return {
      status: 'FAILED',
      error: 'KEYS_ISSUE',
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

  await lambda.invoke({
    FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-lambdas`,
    InvocationType: 'Event',
    LogType: 'None',
    Payload: JSON.stringify({
      triggerStatsUpdate: true,
      ...tenant,
    }),
  }).promise()

  await lambda.invoke({
    FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-dynamo-tables`,
    InvocationType: 'Event',
    LogType: 'None',
    Payload: JSON.stringify({
      triggerStatsUpdate: true,
      ...tenant,
    }),
  }).promise()

  return tenant
}
