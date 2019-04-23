import { orderBy } from 'lodash'
import { listTenants } from './utils'

export const handler = async (request) => {
  const { userId } = request

  const tenants = await listTenants(userId)

  return orderBy(tenants, ['createdAt', 'id'])
}
