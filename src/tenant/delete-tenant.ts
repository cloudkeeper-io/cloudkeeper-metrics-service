// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { queryForArray } from '../utils/dynamodb'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  console.log('Request: ', request)

  const { tenantId, userId } = request

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

  await dynamoDb.delete({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
    Key: {
      id: tenantId,
    },
  }).promise()

  const accessRows = await queryForArray({
    TableName: `${process.env.stage}-cloudkeeper-tenant-users`,
    IndexName: 'tenantIdIndex',
    KeyConditionExpression: 'tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':tenantId': tenantId,
    },
  })

  console.log(`Removing access for ${accessRows.length} users`)

  for (const accessRow of accessRows) {
    await dynamoDb.delete({
      TableName: `${process.env.stage}-cloudkeeper-tenant-users`,
      Key: {
        userId: accessRow.userId,
        tenantId: accessRow.tenantId,
      },
    }).promise()
  }

  console.log('Deleted tenant', tenantId)

  return tenant
}
