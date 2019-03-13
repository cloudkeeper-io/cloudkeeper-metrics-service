/* eslint-disable no-param-reassign */
import { map, orderBy } from 'lodash'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  const tenantIds = request.tenantIds

  const tenantsTableName = `${process.env.stage}-cloudkeeper-tenants`
  const result = await dynamoDb.batchGet({
    RequestItems: {
      [tenantsTableName]: {
        Keys: map(tenantIds, tenantId => ({
          id: tenantId,
        })),
      },
    },
  }).promise()

  return orderBy(map(result.Responses![tenantsTableName], (tenant) => {
    delete tenant.accessKey
    delete tenant.secretKey

    return tenant
  }), 'name')
}
