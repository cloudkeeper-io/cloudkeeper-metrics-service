import { map } from 'lodash'
import { queryForArray } from '../utils/dynamodb'
import { getDynamo } from '../utils/aws.utils'

export const listTenants = async (userId) => {
  const dynamoDb = await getDynamo()

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
