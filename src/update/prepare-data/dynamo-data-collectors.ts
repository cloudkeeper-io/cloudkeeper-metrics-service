import { groupBy, map } from 'lodash'

import { getConnection } from '../../db/db'
import { getDateCondition } from './common'

const dataPointsQuery = (columns, groupDaily) => {
  const dateTimeColumn = groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'

  return 'select name, '
    + columns.join(', ')
    + ', '
    + dateTimeColumn
    + ' from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + ' and name in (?) '
    + (groupDaily ? ' group by name, DATE(dateTime) ' : '')
    + 'order by ' + (groupDaily ? 'DATE(dateTime)' : 'dateTime') + ' asc'
}

export const getMostReadTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select name, sum (consumedRead) as `consumedRead`, '
    + 'sum (provisionedRead) * 3600 as `provisionedRead`'
    + ' from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having consumedRead > 0 '
    + 'order by `consumedRead` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  const columns = groupDaily
    ? ['sum(consumedRead) as `consumedRead`', 'sum(provisionedRead) * 3600 as `provisionedRead`']
    : ['consumedRead as `consumedRead`', 'provisionedRead * 3600 as `provisionedRead`']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
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

  const tablesQuery = 'select name, sum (consumedWrite) as `consumedWrite`,'
    + ' sum (provisionedWrite) * 3600 as `provisionedWrite` '
    + 'from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having consumedWrite > 0 '
    + 'order by `consumedWrite` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  const columns = groupDaily
    ? ['sum(consumedWrite) as `consumedWrite`', 'sum(provisionedWrite) * 3600 as `provisionedWrite`']
    : ['consumedWrite', 'provisionedWrite * 3600 as `provisionedWrite`']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
    [tenantId, daysAgo, map(tables, 'name')],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...table,
    dataPoints: dataPointsMap[table.name],
  }))
}

export const getMostThrottledTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select name, sum (throttledRequests) as `throttledRequests`'
    + 'from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having throttledRequests > 0 '
    + 'order by `throttledRequests` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  if (tables.length === 0) {
    return []
  }

  const columns = groupDaily
    ? ['sum(throttledRequests) as `throttledRequests`']
    : ['throttledRequests']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
    [tenantId, daysAgo, map(tables, 'name')],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...table,
    dataPoints: dataPointsMap[table.name],
  }))
}

export const getMostExpensiveTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select name, sum (throttledRequests) as `throttledRequests`'
    + 'from DynamoTableStats '
    + 'where tenantId = ? and throttledRequests > 0 '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'order by `throttledRequests` desc '
    + 'having throttledRequests > 0 '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  const getMostThrottledTablesDataPoints = 'select name, throttledRequests, '
    + 'dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(false)
    + ' and name in (?) '
    + 'order by dateTime asc'

  const getMostThrottledTablesDataPointsDaily = 'select name, '
    + 'sum(throttledRequests) as `throttledRequests`, '
    + 'DATE(dateTime) as dateTime from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + ' and name in (?) '
    + 'group by name, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostThrottledTablesDataPointsDaily : getMostThrottledTablesDataPoints,
    [tenantId, daysAgo, map(tables, 'name')],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...table,
    dataPoints: dataPointsMap[table.name],
  }))
}
