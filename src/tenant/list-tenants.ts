/* eslint-disable no-param-reassign */
import { map, orderBy } from 'lodash'
import { listTenants } from './utils'

export const handler = async (request) => {
  const { userId, provider } = request

  const tenants = await listTenants(userId, provider)

  return orderBy(map(tenants, (tenant) => {
    delete tenant.accessKey
    delete tenant.secretKey

    return tenant
  }), ['name', 'id'])
}
