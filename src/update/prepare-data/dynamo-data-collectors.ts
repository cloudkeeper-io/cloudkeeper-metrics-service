import { groupBy, map } from 'lodash'

import { getConnection } from '../../db/db'
import { getDateCondition } from './common'

export const getMostReadTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select name, sum (consumedRead) as `readUnits` from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'order by `readUnits` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  const getMostReadTablesDataPoints = 'select name, consumedRead as `readUnits`, dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(false)
    + ' and name in (?) '
    + 'order by dateTime asc'

  const getMostReadTablesDataPointsDaily = 'select name, '
    + 'sum(consumedRead) as `readUnits`, DATE(dateTime) as dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + ' and name in (?) '
    + 'group by name, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostReadTablesDataPointsDaily : getMostReadTablesDataPoints,
    [tenantId, daysAgo, map(tables, 'name')],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...table,
    dataPoints: dataPointsMap[table.name],
  }))
}

export const getMostWritesTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select name, sum (consumedWrite) as `writeUnits` from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'order by `writeUnits` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  const getMostReadTablesDataPoints = 'select name, consumedWrite as `writeUnits`, dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(false)
    + ' and name in (?) '
    + 'order by dateTime asc'

  const getMostReadTablesDataPointsDaily = 'select name, '
    + 'sum(consumedWrite) as `writeUnits`, DATE(dateTime) as dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + ' and name in (?) '
    + 'group by name, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostReadTablesDataPointsDaily : getMostReadTablesDataPoints,
    [tenantId, daysAgo, map(tables, 'name')],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...table,
    dataPoints: dataPointsMap[table.name],
  }))
}
