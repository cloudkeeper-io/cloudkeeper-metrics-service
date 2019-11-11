import { getCostsPerService, getCostsPerStack } from '../update/prepare-data/costs-data-collectors'

export const handler = async ({ tenantId, startDate, endDate }) => {
  const costsPerService = await getCostsPerService(tenantId, startDate, endDate)
  const costsPerStack = await getCostsPerStack(tenantId, startDate, endDate)

  return {
    costsPerService,
    costsPerStack,
  }
}
