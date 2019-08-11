/* eslint-disable prefer-template */
import { groupBy, map, flatMap, reduce, times, constant } from 'lodash'
import { getConnection } from '../../db/db'
import { getDateCondition, fillEmptyDataPoints } from './common'

const dataPointsQuery = (columns, groupDaily, lambdasNum) => {
  const dateTimeColumn = groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'

  return 'select lambdaName, region, '
    + columns.join(', ')
    + ', '
    + dateTimeColumn
    + ' from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + ' and ('
    + times(lambdasNum, constant('(lambdaName = ? and region = ?)')).join(' or ')
    + ') '
    + (groupDaily ? ' group by lambdaName, region, DATE(dateTime) ' : '')
    + 'order by ' + (groupDaily ? 'DATE(dateTime)' : 'dateTime') + ' asc'
}

export const getTotals = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const totalsQuery = 'select sum(invocations) as invocations, sum(`errors`) as `errors`, `dateTime`, '
    + 'COALESCE(SUM(averageDuration * invocations) * c.size / 1024 / 1000 * lp.pricePerGbSeconds, 0) + '
    + 'COALESCE(SUM(invocations * lp.requestPrice), 0) as cost '
    + 'from LambdaStats '
    + 'join LambdaConfiguration c '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaStats.region = LambdaConfiguration.region '
    + 'and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice lp on LambdaPrice.region = LambdaConfiguration.region '
    + 'where LambdaStats.tenantId = ? and  '
    + getDateCondition(false)
    + 'group by dateTime '
    + 'order by dateTime asc'

  const totalsQueryDaily = 'select '
    + 'sum(invocations) as invocations, '
    + 'sum(`errors`) as `errors`, '
    + 'DATE(`dateTime`) as `dateTime`, '
    + 'COALESCE(SUM(averageDuration * invocations) * c.size / 1024 / 1000 * lp.pricePerGbSeconds, 0) + '
    + 'COALESCE(SUM(invocations * lp.requestPrice), 0) as cost '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaStats.region = LambdaConfiguration.region '
    + 'and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.region = LambdaConfiguration.region '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(true)
    + 'group by DATE(dateTime) '
    + 'order by dateTime asc'

  const dataPoints = await connection.query(groupDaily ? totalsQueryDaily : totalsQuery, [tenantId, tenantId, daysAgo])

  const totals = reduce(dataPoints, (acc, datapoint) => {
    acc.invocations += Number(datapoint.invocations)
    acc.errors += Number(datapoint.errors)
    acc.cost += Number(datapoint.cost)

    return acc
  }, { invocations: 0, errors: 0, cost: 0 })

  const allDataPoints = fillEmptyDataPoints(dataPoints, groupDaily, daysAgo, {
    cost: 0,
    errors: '0',
    invocations: '0',
  })

  return {
    dataPoints: allDataPoints,
    ...totals,
  }
}

export const getSlowestLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getSlowestLambdasQuery = 'select '
    + 'lambdaName, LambdaConfiguration.region as region, size, timeout, runtime, codeSize, '
    + 'sum(averageDuration * invocations) / sum(invocations) as `averageDuration`, '
    + 'max(maxDuration) as `maxDuration` '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId '
    + 'and LambdaConfiguration.region = LambdaStats.region) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName, region '
    + 'order by `averageDuration` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  if (lambdas.length === 0) {
    return []
  }

  const columns = groupDaily ? [
    'sum(averageDuration * invocations) / sum(invocations) as `averageDuration`',
    'max(maxDuration) as `maxDuration`',
  ] : [
    'averageDuration', 'maxDuration',
  ]

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily, lambdas.length),
    [tenantId, daysAgo, ...flatMap(lambdas, lambda => [lambda.lambdaName, lambda.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.lambdaName} ${dataPoint.region}`)

  return map(lambdas, (lambda) => {
    const lambdaDataPoints = dataPointsMap[`${lambda.lambdaName} ${lambda.region}`]

    const allDataPoints = fillEmptyDataPoints(lambdaDataPoints, groupDaily, daysAgo, {
      averageDuration: 0,
      maxDuration: 0,
      lambdaName: lambda.lambdaName,
      region: lambda.region,
    })

    return ({
      ...lambda,
      dataPoints: allDataPoints,
    })
  })
}

export const getMostInvokedLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getMostInvokedLambdasQuery = 'select lambdaName, LambdaConfiguration.region as region, '
    + 'sum(invocations) as `invocations`,'
    + 'sum(invocations) / (? * 3600 * 24) as `invocationsPerSecond`,'
    + 'size, timeout, runtime, codeSize from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId '
    + 'and LambdaConfiguration.region = LambdaStats.region) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName, region '
    + 'order by `invocations` desc '
    + 'limit 5'

  const lambdas = await connection.query(getMostInvokedLambdasQuery, [daysAgo, tenantId, daysAgo])

  if (lambdas.length === 0) {
    return []
  }

  const columns = groupDaily ? ['sum(invocations) as invocations'] : ['invocations']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily, lambdas.length),
    [tenantId, daysAgo, ...flatMap(lambdas, lambda => [lambda.lambdaName, lambda.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.lambdaName} ${dataPoint.region}`)

  return map(lambdas, (lambda) => {
    const lambdaDataPoints = dataPointsMap[`${lambda.lambdaName} ${lambda.region}`]

    const allDataPoints = fillEmptyDataPoints(lambdaDataPoints, groupDaily, daysAgo, {
      invocations: '0',
      lambdaName: lambda.lambdaName,
      region: lambda.region,
    })

    return ({
      ...lambda,
      dataPoints: allDataPoints,
    })
  })
}

export const getMostErrorsLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getSlowestLambdasQuery = 'select lambdaName, LambdaConfiguration.region as region, sum(errors) as `errors`,'
    + 'sum(errors) / sum(invocations) as `errorRate`,'
    + 'size, timeout, runtime, codeSize from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId '
    + 'and LambdaConfiguration.region = LambdaStats.region) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName, region '
    + 'order by `errors` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  if (lambdas.length === 0) {
    return []
  }

  const columns = groupDaily ? ['sum(errors) as errors'] : ['errors']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily, lambdas.length),
    [tenantId, daysAgo, ...flatMap(lambdas, lambda => [lambda.lambdaName, lambda.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.lambdaName} ${dataPoint.region}`)

  return map(lambdas, (lambda) => {
    const lambdaDataPoints = dataPointsMap[`${lambda.lambdaName} ${lambda.region}`]

    const allDataPoints = fillEmptyDataPoints(lambdaDataPoints, groupDaily, daysAgo, {
      errors: '0',
      lambdaName: lambda.lambdaName,
      region: lambda.region,
    })

    return ({
      ...lambda,
      dataPoints: allDataPoints,
    })
  })
}


export const getMostExpensiveLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getMostExpensiveLambdasQuery = 'select lambdaName, LambdaConfiguration.region as region, '
    + 'LambdaConfiguration.size as size, '
    + 'timeout, runtime, codeSize, '
    + 'sum(averageDuration * invocations) / 100 * LambdaPrice.price as cost from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'and LambdaConfiguration.region = LambdaStats.region '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName, region '
    + 'order by cost desc '
    + 'limit 5'

  const lambdas = await connection.query(getMostExpensiveLambdasQuery, [tenantId, tenantId, daysAgo])

  if (lambdas.length === 0) {
    return []
  }

  const getMostExpensiveLambdasDataPointsQuery = 'select lambdaName, LambdaConfiguration.region as region, '
    + (groupDaily ? 'sum(averageDuration * invocations) / 100 * LambdaPrice.price as cost, '
      : 'averageDuration * invocations / 100 * LambdaPrice.price as cost, ')
    + (groupDaily ? 'DATE(`dateTime`) as `dateTime`' : '`dateTime` ')
    + ' from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + ' and LambdaConfiguration.region = LambdaStats.region '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'and ( '
    + times(lambdas.length, constant('(lambdaName = ? and LambdaConfiguration.region = ?)')).join(' or ')
    + ' ) '
    + (groupDaily ? 'group by lambdaName, region, DATE(dateTime) order by DATE(dateTime) asc' : 'order by dateTime asc')

  const dataPoints = await connection.query(
    getMostExpensiveLambdasDataPointsQuery,
    [tenantId, tenantId, daysAgo, ...flatMap(lambdas, lambda => [lambda.lambdaName, lambda.region])],
  )

  const dataPointsMap = groupBy(dataPoints, dataPoint => `${dataPoint.lambdaName} ${dataPoint.region}`)

  return map(lambdas, (lambda) => {
    const lambdaDataPoints = dataPointsMap[`${lambda.lambdaName} ${lambda.region}`]

    const allDataPoints = fillEmptyDataPoints(lambdaDataPoints, groupDaily, daysAgo, {
      cost: 0,
      lambdaName: lambda.lambdaName,
      region: lambda.region,
    })

    return ({
      ...lambda,
      dataPoints: allDataPoints,
    })
  })
}
