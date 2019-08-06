import { getConnection } from '../db/db'

export const handler = async (request) => {
  const { tenantId, startDate, endDate } = request

  const connection = await getConnection()

  return connection.query(`
    select dt.*,
    COALESCE(sum(dts.provisionedRead), 0) as provisionedRead,
    COALESCE(sum(dts.provisionedWrite), 0) as provisionedWrite,
    COALESCE(sum(dts.consumedRead), 0) as consumedRead,
    COALESCE(sum(dts.consumedWrite), 0) as consumedWrite,
    COALESCE(sum(dts.throttledReads), 0) as throttledReads,
    COALESCE(sum(dts.throttledWrites), 0) as throttledWrites
    from DynamoTable dt
    left join DynamoTableStats dts on dts.name = dt.name and dts.region = dt.region 
    and dts.tenantId = dt.tenantId and DATE(dts.dateTime) >= ? and DATE(dts.dateTime) <= ?
    where dt.tenantId = ? 
    group by dt.tenantId, dt.name, dt.region, dt.billingMode, dt.sizeBytes, dt.items
`, [startDate, endDate, tenantId])
}
