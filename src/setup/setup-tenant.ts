import * as AWS from 'aws-sdk'
import * as Lambda from 'aws-sdk/clients/lambda'
import { checkAccess } from '../utils/lambda-metrics.util'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (request) => {
  console.log('Request: ', request)

  const { roleArn, tenantId, userId } = request

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

  if (tenant.owner.id !== userId) {
    throw new Error('Tenant not found')
  }

  try {
    const additionalInfo = await checkAccess(tenantId, roleArn)

    const updatedTenant = {
      ...tenant,
      isSetupCompleted: true,
      roleArn,
    }

    await dynamoDb.put({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Item: updatedTenant,
    }).promise()

    await lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-lambdas`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(updatedTenant),
    }).promise()

    await lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-dynamo-tables`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(updatedTenant),
    }).promise()

    await lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-costs-for-tenant`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(updatedTenant),
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
