import { getCostsPerService } from '../update/prepare-data/costs-data-collectors'

export const handler = ({ tenantId, startDate, endDate }) => {
    return getCostsPerService(tenantId, startDate, endDate)
}
