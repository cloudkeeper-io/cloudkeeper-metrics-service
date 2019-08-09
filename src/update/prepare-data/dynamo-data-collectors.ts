import { groupBy, flatMap, map, times, constant } from 'lodash'

import { getConnection } from '../../db/db'
import { fillEmptyDataPoints, getDateCondition } from './common'

const dataPointsQuery = (columns, groupDaily, tablesNum) => {
  const dateTimeColumn = groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'

  return 'select name, region, '
    + columns.join(', ')
    + ', '
    + dateTimeColumn
    + ' from DynamoTableStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + ' and ('
    + times(tablesNum, constant('(name = ? and region = ?)')).join(' or ')
    + ')'
    + (groupDaily ? ' group by name, region, DATE(dateTime) ' : '')
    + ' order by ' + (groupDaily ? 'DATE(dateTime)' : 'dateTime') + ' asc'
}

export const getMostReadTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select DynamoTableStats.name, DynamoTableStats.region as region, '
    + 'sum (consumedRead) as `consumedRead`, '
    + 'sum(consumedRead) / (? * 3600 * 24) as `averageConsumedRead`,'
    + 'sum (provisionedRead) * 3600 as `provisionedRead`, items, billingMode, sizeBytes '
    + 'from DynamoTableStats '
    + 'join DynamoTable on (DynamoTableStats.name = DynamoTable.name '
    + 'and DynamoTableStats.tenantId = DynamoTable.tenantId '
    + 'and DynamoTableStats.region = DynamoTable.region) '
    + 'where DynamoTableStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name, region '
    + 'having consumedRead > 0 '
    + 'order by `consumedRead` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [daysAgo, tenantId, daysAgo])

  if (tables.length === 0) {
    return []
  }

  const columns = groupDaily
    ? ['sum(consumedRead) as `consumedRead`', 'sum(provisionedRead) * 3600 as `provisionedRead`']
    : ['consumedRead as `consumedRead`', 'provisionedRead * 3600 as `provisionedRead`']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily, tables.length),
    [tenantId, daysAgo, ...flatMap(tables, table => [table.name, table.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.name} ${dataPoint.region}`)

  return map(tables, (table) => {
    const tableDataPoints = dataPointsMap[`${table.name} ${table.region}`]

    const allDataPoints = fillEmptyDataPoints(tableDataPoints, groupDaily, daysAgo, {
      consumedRead: '0',
      provisionedRead: '0',
      name: table.name,
      region: table.region,
    })

    return ({
      ...table,
      dataPoints: allDataPoints,
    })
  })
}

export const getMostWritesTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select DynamoTableStats.name, sum (consumedWrite) as `consumedWrite`,'
    + 'DynamoTableStats.region as region, '
    + 'sum(consumedWrite) / (? * 3600 * 24) as `averageConsumedWrite`,'
    + 'sum (provisionedWrite) * 3600 as `provisionedWrite`, items, billingMode, sizeBytes '
    + 'from DynamoTableStats '
    + 'join DynamoTable on (DynamoTableStats.name = DynamoTable.name '
    + 'and DynamoTableStats.tenantId = DynamoTable.tenantId '
    + 'and DynamoTableStats.region = DynamoTable.region) '
    + 'where DynamoTableStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by name '
    + 'having consumedWrite > 0 '
    + 'order by `consumedWrite` desc '
    + 'limit 5'

  const tables = await connection.query(tablesQuery, [daysAgo, tenantId, daysAgo])

  if (tables.length === 0) {
    return []
  }

  const columns = groupDaily
    ? ['sum(consumedWrite) as `consumedWrite`', 'sum(provisionedWrite) * 3600 as `provisionedWrite`']
    : ['consumedWrite', 'provisionedWrite * 3600 as `provisionedWrite`']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily, tables.length),
    [tenantId, daysAgo, ...flatMap(tables, table => [table.name, table.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.name} ${dataPoint.region}`)

  return map(tables, (table) => {
    const tableDataPoints = dataPointsMap[`${table.name} ${table.region}`]

    const allDataPoints = fillEmptyDataPoints(tableDataPoints, groupDaily, daysAgo, {
      consumedWrite: '0',
      provisionedWrite: '0',
      name: table.name,
      region: table.region,
    })

    return ({
      ...table,
      dataPoints: allDataPoints,
    })
  })
}

export const getMostThrottledTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = 'select DynamoTableStats.name, sum (throttledReads + throttledWrites) as `throttledRequests`, '
    + 'DynamoTableStats.region as region, '
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
    dataPointsQuery(columns, groupDaily, tables.length),
    [tenantId, daysAgo, ...flatMap(tables, table => [table.name, table.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.name} ${dataPoint.region}`)

  return map(tables, (table) => {
    const tableDataPoints = dataPointsMap[`${table.name} ${table.region}`]

    const allDataPoints = fillEmptyDataPoints(tableDataPoints, groupDaily, daysAgo, {
      throttledReads: '0',
      throttledWrites: '0',
      throttledRequests: '0',
      name: table.name,
      region: table.region,
    })

    return ({
      ...table,
      dataPoints: allDataPoints,
    })
  })
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

export const getMostExpensiveTables = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const tablesQuery = `
      select DynamoTableStats.name,
         DynamoTable.region,
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
  join DynamoTable on (DynamoTable.name = DynamoTableStats.name and 
                       DynamoTable.tenantId = DynamoTableStats.tenantId and 
                       DynamoTable.region = DynamoTableStats.region)
  join DynamoStoragePrice on DynamoStoragePrice.region = DynamoTable.region
  join DynamoProvisionedPrice on DynamoProvisionedPrice.region = DynamoTable.region
  where billingMode = 'PROVISIONED' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  group by DynamoTableStats.name
  UNION ALL
  select DynamoTableStats.name,
         DynamoTable.region,
         DynamoTable.billingMode,
         sizeBytes,
         items,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo}) * gbPerMonthPrice as storagePrice,
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` as readPrice,
         sum(consumedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as writePrice,
         sizeBytes / (1024 * 1024 * 1024 * 30 / ${daysAgo})  * gbPerMonthPrice +
         sum(consumedRead) / 1000000 * DynamoPerRequestPrice.\`read\` +
         sum(consumedWrite) / 1000000 * DynamoPerRequestPrice.\`write\` as totalPrice,
         sum(consumedRead) as readStat,
         sum(consumedWrite) as writeStat
  from DynamoTableStats
        join DynamoTable 
          on (DynamoTable.name = DynamoTableStats.name and 
                DynamoTable.tenantId = DynamoTableStats.tenantId and 
                DynamoTable.region = DynamoTableStats.region)
        join DynamoStoragePrice on DynamoStoragePrice.region = DynamoTable.region
        join DynamoPerRequestPrice on DynamoPerRequestPrice.region = DynamoTable.region
  where billingMode = 'PAY_PER_REQUEST' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  group by DynamoTableStats.name
  order by totalPrice desc
  limit 5
`

  const tables = await connection.query(
    tablesQuery,
    [tenantId, daysAgo, tenantId, daysAgo],
  )

  const expensiveDataPointsQuery = `
    select DynamoTableStats.name,
         DynamoTable.region,
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
  join DynamoTable on (DynamoTable.name = DynamoTableStats.name and 
                        DynamoTable.tenantId = DynamoTableStats.tenantId and 
                        DynamoTable.region = DynamoTableStats.region)
  join DynamoStoragePrice on DynamoStoragePrice.region = DynamoTable.region
  join DynamoProvisionedPrice on DynamoProvisionedPrice.region = DynamoTable.region
  where billingMode = 'PROVISIONED' and DynamoTable.tenantId = ? and ${getDateCondition(groupDaily)}
  and DynamoTable.name in (?)
  group by DynamoTableStats.name, ${groupDaily ? 'DATE(dateTime)' : 'dateTime'}
  UNION ALL
  select DynamoTableStats.name,
         DynamoTable.region,
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
          on (DynamoTable.name = DynamoTableStats.name and 
                DynamoTable.tenantId = DynamoTableStats.tenantId and 
                DynamoTable.region = DynamoTableStats.region)
        join DynamoStoragePrice on DynamoStoragePrice.region = DynamoTable.region
        join DynamoPerRequestPrice on DynamoPerRequestPrice.region = DynamoTable.region
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
    [tenantId, daysAgo, tableNames, tenantId, daysAgo, tableNames],
  )

  const dataPointsMap = groupBy(dataPoints, 'name')

  return map(tables, (table) => {
    const tableDataPoints = dataPointsMap[table.name]

    const allDataPoints = fillEmptyDataPoints(tableDataPoints, groupDaily, daysAgo, {
      billingMode: tableDataPoints[0].billingMode,
      readPrice: 0,
      readStat: '0',
      sizeBytes: tableDataPoints[0].sizeBytes,
      storagePrice: 0,
      totalPrice: 0,
      writePrice: 0,
      writeStat: '0',
      name: table.name,
    })

    return ({
      ...fixStatNames(table, table),
      dataPoints: map(allDataPoints, dataPoint => fixStatNames(table, dataPoint)),
    })
  })
}
