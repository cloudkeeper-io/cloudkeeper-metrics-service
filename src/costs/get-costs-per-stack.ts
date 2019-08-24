import { getCostsPerStack } from '../update/prepare-data/costs-data-collectors'

export const handler = ({ tenantId, startDate, endDate }) => {
  return getCostsPerStack(tenantId, startDate, endDate)
}
