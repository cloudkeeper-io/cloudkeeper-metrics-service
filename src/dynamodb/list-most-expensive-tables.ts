import { getConnection } from '../db/db'

export const handler = async (request) => {
  const { tenantId, startDate, endDate } = request

  const connection = await getConnection()

  return connection.query(`
    select dt.*,
    COALESCE(sum(dts.cost), 0) as cost
    from DynamoTable dt
    left join DynamoTableStats dts on dts.name = dt.name and dts.region = dt.region 
    and dts.tenantId = dt.tenantId and dts.dateTime >= ? and dts.dateTime <= ?
    where dt.tenantId = ? and cost <> 0
    group by dt.tenantId, dt.name, dt.region, dt.billingMode, dt.sizeBytes, dt.items
    order by cost desc limit 5
`, [startDate, endDate, tenantId])
}
