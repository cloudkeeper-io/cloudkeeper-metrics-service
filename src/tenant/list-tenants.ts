import { orderBy } from 'lodash'
import { listTenants } from './utils'

export const handler = async (request) => {
  const { userId, provider } = request

  const tenants = await listTenants(userId, provider)

  return orderBy(tenants, ['createdAt', 'id'])
}
