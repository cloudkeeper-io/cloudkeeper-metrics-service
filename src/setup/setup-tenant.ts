import * as AWS from 'aws-sdk'
import * as Lambda from 'aws-sdk/clients/lambda'
import { checkAccess } from '../utils/lambda.util'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (request) => {
  console.log('Request: ', request)

  const { roleArn, tenantId, userId, provider } = request

  const tenantResponse = await dynamoDb.get({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
    Key: {
      id: tenantId,
    },
  }).promise()

  if (!tenantResponse.Item) {
    throw new Error('Tenant not found')
  }

  const tenant = tenantResponse.Item

  if (tenant.owner.id !== userId || tenant.owner.provider !== provider) {
    throw new Error('Tenant not found')
  }

  try {
    const additionalInfo = await checkAccess(tenantId, roleArn)

    await dynamoDb.put({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Item: {
        ...tenant,
        isSetupCompleted: true,
        roleArn,
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

    return {
      status: 'SUCCESS',
      ...additionalInfo,
    }
  } catch (err) {
    console.log('error setting up access for tenant ', err)
    return {
      status: 'FAILED',
      error: 'KEYS_ISSUE',
    }
  }
}
