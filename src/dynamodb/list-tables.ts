import { getConnection } from '../db/db'

export const handler = async (request) => {
  const { tenantId, startDate, endDate } = request

  const connection = await getConnection()

  return connection.query(`
    select dt.*,
    COALESCE(avg(dts.provisionedRead), 0) as avgProvisionedRead,
    COALESCE(avg(dts.provisionedWrite), 0) as avgProvisionedWrite,
    COALESCE(avg(dts.consumedRead), 0) as avgConsumedRead,
    COALESCE(avg(dts.consumedWrite), 0) as avgConsumedWrite,
    COALESCE(sum(dts.throttledReads, 0) as throttledReads,
    COALESCE(sum(dts.throttledWrites, 0) as throttledWrites,
    from DynamoTable dt
    left join DynamoTableStats dts on dts.name = dt.name and dts.region = dt.region 
    and dts.tenantId = dt.tenantId and dts.dateTime > ? and dts.dateTime <= ?
    where dts.tenantId = ? 
    group by dt.tenantId, dt.name, dt.region, dt.billingMode, dt.sizeBytes, dt.items
`, [startDate, endDate, tenantId])
}
