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

  const tablesQuery = 'select DynamoTableStats.name, sum (consumedRead) as `consumedRead`, '
    + 'sum (provisionedRead) * 3600 as `provisionedRead`, items, billingMode, sizeBytes '
    + 'from DynamoTableStats '
    + 'join DynamoTable on (DynamoTableStats.name = DynamoTable.name '
    + 'and DynamoTableStats.tenantId = DynamoTable.tenantId) '
    + 'where DynamoTableStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having consumedRead > 0 '
    + 'order by `consumedRead` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  if (tables.length === 0) {
    return []
  }

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

  const tablesQuery = 'select DynamoTableStats.name, sum (consumedWrite) as `consumedWrite`,'
    + ' sum (provisionedWrite) * 3600 as `provisionedWrite`, items, billingMode, sizeBytes '
    + 'from DynamoTableStats '
    + 'join DynamoTable on (DynamoTableStats.name = DynamoTable.name '
    + 'and DynamoTableStats.tenantId = DynamoTable.tenantId) '
    + 'where DynamoTableStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having consumedWrite > 0 '
    + 'order by `consumedWrite` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [tenantId, daysAgo])

  if (tables.length === 0) {
    return []
  }

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

  const tablesQuery = 'select DynamoTableStats.name, sum (throttledReads + throttledWrites) as `throttledRequests`, '
    + 'sum (throttledReads) as `throttledReads`, '
    + 'sum (throttledWrites) as `throttledWrites`, items, billingMode, sizeBytes '
    + 'from DynamoTableStats '
    + 'join DynamoTable on (DynamoTableStats.name = DynamoTable.name '
    + 'and DynamoTableStats.tenantId = DynamoTable.tenantId) '
    + 'where DynamoTableStats.tenantId = ? and '
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
    ? [
      'sum (throttledReads + throttledWrites) as `throttledRequests`',
      'sum (throttledReads) as `throttledReads`',
      'sum (throttledWrites) as `throttledWrites`',
    ]
    : [
      'throttledReads + throttledWrites as `throttledRequests`',
      'throttledReads',
      'throttledWrites',
    ]

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

const fixStatNames = (table, entity): any => {
  const fixedEntity = {
    ...entity,
  }

  if (table.billingMode === 'PROVISIONED') {
    fixedEntity.averageReadProvisioned = table.readStat
    fixedEntity.averageWriteProvisioned = table.writeStat
  } else {
    fixedEntity.consumedReadCapacity = table.readStat
    fixedEntity.consumedWriteCapacity = table.writeStat
  }

  delete fixedEntity.readStat
  delete fixedEntity.writeStat

  return fixedEntity
}

export const getMostExpensiveTables = async (tenantId, region, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = `
      select DynamoTableStats.name,
         DynamoTable.billingMode,
         sizeBytes,
         items,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo})  * gbPerMonthPrice as storagePrice,
         sum(provisionedRead) * DynamoProvisionedPrice.\`read\` as readPrice,
         sum(provisionedWrite) * DynamoProvisionedPrice.\`write\` as writePrice,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo})  * gbPerMonthPrice +
         sum(provisionedRead) * DynamoProvisionedPrice.\`read\` +
         sum(provisionedWrite) * DynamoProvisionedPrice.\`write\` as totalPrice,
         avg(provisionedRead) as readStat,
         avg(provisionedWrite) as writeStat
  from DynamoTableStats
  join DynamoTable on (DynamoTable.name = DynamoTableStats.name and DynamoTable.tenantId = DynamoTableStats.tenantId)
  join DynamoStoragePrice on DynamoStoragePrice.region = ?
  join DynamoProvisionedPrice on DynamoProvisionedPrice.region = ?
  where billingMode = 'PROVISIONED' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  group by DynamoTableStats.name
  UNION ALL
  select DynamoTableStats.name,
         DynamoTable.billingMode,
         sizeBytes,
         items,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo}) * gbPerMonthPrice as storagePrice,
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` as readPrice,
         sum(consumedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as writePrice,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo})  * gbPerMonthPrice +
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` +
         sum(provisionedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as totalPrice,
         sum(consumedRead) as readStat,
         sum(consumedWrite) as writeStat
  from DynamoTableStats
        join DynamoTable 
          on (DynamoTable.name = DynamoTableStats.name and DynamoTable.tenantId = DynamoTableStats.tenantId)
        join DynamoStoragePrice on DynamoStoragePrice.region = ?
        join DynamoPerRequestPrice on DynamoPerRequestPrice.region = ?
  where billingMode = 'PAY_PER_REQUEST' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  group by DynamoTableStats.name
  order by totalPrice desc
  limit 5
`

  const tables = await connection.query(
    tablesQuery,
    [region, region, tenantId, daysAgo, region, region, tenantId, daysAgo],
  )

  const expensiveDataPointsQuery = `
    select DynamoTableStats.name,
         DynamoTable.billingMode,
         sizeBytes,
         sizeBytes / (1024 * 1024 * 1024 * ${groupDaily ? daysAgo : (24 * 30)}) * gbPerMonthPrice as storagePrice,
         sum(provisionedRead) * DynamoProvisionedPrice.\`read\` as readPrice,
         sum(provisionedWrite) * DynamoProvisionedPrice.\`write\` as writePrice,
         sizeBytes / (1024 * 1024 * 1024 * ${groupDaily ? daysAgo : (24 * 30)}) * gbPerMonthPrice +
         sum(provisionedRead) * DynamoProvisionedPrice.\`read\` +
         sum(provisionedWrite) * DynamoProvisionedPrice.\`write\` as totalPrice,
         avg(provisionedRead) as readStat,
         avg(provisionedWrite) as writeStat,
         ${groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'}
  from DynamoTableStats
  join DynamoTable on (DynamoTable.name = DynamoTableStats.name and DynamoTable.tenantId = DynamoTableStats.tenantId)
  join DynamoStoragePrice on DynamoStoragePrice.region = ?
  join DynamoProvisionedPrice on DynamoProvisionedPrice.region = ?
  where billingMode = 'PROVISIONED' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  and DynamoTable.name in (?)
  group by DynamoTableStats.name, ${groupDaily ? 'DATE(dateTime)' : 'dateTime'}
  UNION ALL
  select DynamoTableStats.name,
         DynamoTable.billingMode,
         sizeBytes,
         sizeBytes / (1024 * 1024 * 1024 * ${groupDaily ? daysAgo : (24 * 30)}) * gbPerMonthPrice as storagePrice,
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` as readPrice,
         sum(consumedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as writePrice,
         sizeBytes / (1024 * 1024 * 1024 * ${groupDaily ? daysAgo : (24 * 30)}) * gbPerMonthPrice +
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` +
         sum(provisionedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as totalPrice,
         sum(consumedRead) as readStat,
         sum(consumedWrite) as writeStat,
         ${groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'}
  from DynamoTableStats
        join DynamoTable 
          on (DynamoTable.name = DynamoTableStats.name and DynamoTable.tenantId = DynamoTableStats.tenantId)
        join DynamoStoragePrice on DynamoStoragePrice.region = ?
        join DynamoPerRequestPrice on DynamoPerRequestPrice.region = ?
  where billingMode = 'PAY_PER_REQUEST' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  and DynamoTable.name in (?)
  group by DynamoTableStats.name, ${groupDaily ? 'DATE(dateTime)' : 'dateTime'}
  order by ${groupDaily ? 'DATE(dateTime)' : 'dateTime'} asc
`

  if (tables.length === 0) {
    return []
  }

  const tableNames = map(tables, 'name')

  const dataPoints = await connection.query(
    expensiveDataPointsQuery,
    [region, region, tenantId, daysAgo, tableNames, region, region, tenantId, daysAgo, tableNames],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, table => ({
    ...fixStatNames(table, table),
    dataPoints: map(dataPointsMap[table.name], dataPoint => fixStatNames(table, dataPoint)),
  }))
}
