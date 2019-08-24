import { getConnection } from '../db/db'

export const handler = async ({ tenantId, startDate, endDate, offset = 0 }) => {
  const connection = await getConnection()

  const latestEvents = await connection.query(
    `select * from Event 
            where tenantId = ? and dateTime >= ? and dateTime <= ?
            order by \`dateTime\` desc LIMIT 20 OFFSET ?`,
    [tenantId, startDate, endDate, offset],
  )

  return latestEvents
}
