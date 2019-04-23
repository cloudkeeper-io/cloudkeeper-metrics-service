import * as AWS from 'aws-sdk'
import { map } from 'lodash'
import { queryForArray } from '../utils/dynamodb'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const listTenants = async (userId) => {
  const tenantAccessRows = await queryForArray({
    TableName: `${process.env.stage}-cloudkeeper-tenant-users`,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  })

  if (tenantAccessRows.length === 0) {
    return []
  }

  const tenantsTableName = `${process.env.stage}-cloudkeeper-tenants`

  const result = await dynamoDb.batchGet({
    RequestItems: {
      [tenantsTableName]: {
        Keys: map(tenantAccessRows, tenantAccessRow => ({
          id: tenantAccessRow.tenantId,
        })),
      },
    },
  }).promise()

  return result.Responses![tenantsTableName]
}
