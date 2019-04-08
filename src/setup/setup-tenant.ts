import * as AWS from 'aws-sdk'
import { checkAccess } from '../utils/lambda.util'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  console.log(`Request: ${request}`)

  const { roleArn, region, tenantId, userId, provider } = request

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
    const additionalInfo = await checkAccess(tenantId, roleArn, region)

    await dynamoDb.put({
      TableName: `${process.env.stage}-cloudkeeper-tenants`,
      Item: {
        ...tenant,
        isSetupCompleted: true,
        region,
        roleArn,
      },
    }).promise()

    return {
      status: 'SUCCESS',
      ...additionalInfo,
    }
  } catch (err) {
    console.log(`error setting up access for tenant ${tenantId}`, err)
    return {
      status: 'FAILED',
    }
  }
}
