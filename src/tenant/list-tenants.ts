/* eslint-disable no-param-reassign */
import { map, orderBy } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { queryForArray } from '../utils/dynamodb'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  const { userId, provider } = request

  const tenantAccessRows = await queryForArray({
    TableName: `${process.env.stage}-cloudkeeper-tenant-users`,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': `${provider}|${userId}`,
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

  return orderBy(map(result.Responses![tenantsTableName], (tenant) => {
    delete tenant.accessKey
    delete tenant.secretKey

    return tenant
  }), ['name', 'id'])
}
