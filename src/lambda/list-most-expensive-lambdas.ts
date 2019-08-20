import { getConnection } from '../db/db'

export const handler = async (request) => {
  const { tenantId, startDate, endDate } = request

  const connection = await getConnection()

  return connection.query(`
        select c.*,
        COALESCE(SUM(ls.cost), 0) as cost
        from LambdaConfiguration c
        join LambdaPrice lp on lp.region = c.region
        left join LambdaStats ls on c.name = ls.lambdaName and c.region = ls.region 
        and c.tenantId = ls.tenantId and ls.dateTime >= ? and ls.dateTime <= ?
        where c.tenantId = ? and cost <> 0
        group by c.tenantId, c.name, c.region, c.size, c.codeSize, c.runtime, c.timeout
        order by cost desc limit 5
`, [startDate, endDate, tenantId])
}
