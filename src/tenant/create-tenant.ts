import * as uuid from 'uuidv4'
import * as AWS from 'aws-sdk'
import { find } from 'lodash'

import { listTenants } from './utils'

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const handler = async (request) => {
  const { name, userId, provider } = request

  const tenants = await listTenants(userId, provider)

  if (find(tenants, { name })) {
    throw new Error('Tenant name must be unique')
  }

  const tenant = {
    id: uuid(),
    owner: {
      id: request.userId,
      provider: request.provider,
    },
    name,
    isSetupCompleted: false,
    createdAt: new Date().getTime(),
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
