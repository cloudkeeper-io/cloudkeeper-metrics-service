/* eslint-disable prefer-template */
import { groupBy, map, reduce } from 'lodash'
import { getConnection } from '../../db/db'
import { getDateCondition } from './common'

const dataPointsQuery = (columns, groupDaily) => {
  const dateTimeColumn = groupDaily ? 'DATE(dateTime) as dateTime' : 'dateTime'

  return 'select lambdaName, '
    + columns.join(', ')
    + ', '
    + dateTimeColumn
    + ' from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + ' and lambdaName in (?) '
    + (groupDaily ? ' group by lambdaName, DATE(dateTime) ' : '')
    + 'order by ' + (groupDaily ? 'DATE(dateTime)' : 'dateTime') + ' asc'
}

export const getTotals = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const totalsQuery = 'select sum(invocations) as invocations, sum(`errors`) as `errors`, `dateTime`, '
    + 'sum(averageDuration * invocations / 100 * LambdaPrice.price) as cost '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and  '
    + getDateCondition(false)
    + 'group by dateTime '
    + 'order by dateTime asc'

  const totalsQueryDaily = 'select '
    + 'sum(invocations) as invocations, '
    + 'sum(`errors`) as `errors`, '
    + 'DATE(`dateTime`) as `dateTime`, '
    + 'sum(averageDuration * invocations / 100 * LambdaPrice.price) as cost '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
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

  return {
    dataPoints,
    ...totals,
  }
}

export const getSlowestLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getSlowestLambdasQuery = 'select '
    + 'lambdaName, size, timeout, runtime, codeSize, '
    + 'sum(averageDuration * invocations) / sum(invocations) as `averageDuration` '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `averageDuration` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  const columns = groupDaily ? [
    'sum(averageDuration * invocations) / sum(invocations) as `averageDuration`',
    'max(maxDuration) as `maxDuration`',
  ] : [
    'averageDuration', 'maxDuration',
  ]

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
    [tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}

export const getMostInvokedLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getMostInvokedLambdasQuery = 'select lambdaName, sum(invocations) as `invocations`,'
    + 'size, timeout, runtime, codeSize from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `invocations` desc '
    + 'limit 5'

  const lambdas = await connection.query(getMostInvokedLambdasQuery, [tenantId, daysAgo])

  const columns = groupDaily ? ['sum(invocations) as invocations'] : ['invocations']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
    [tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}

export const getMostErrorsLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getSlowestLambdasQuery = 'select lambdaName, sum(errors) as `errors`,'
    + 'size, timeout, runtime, codeSize from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on (LambdaConfiguration.name = LambdaStats.lambdaName '
    + 'and LambdaConfiguration.tenantId = LambdaStats.tenantId) '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `errors` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  const columns = groupDaily ? ['sum(errors) as errors'] : ['errors']

  const dataPoints = await connection.query(
    dataPointsQuery(columns, groupDaily),
    [tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}


export const getMostExpensiveLambdas = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const getMostExpensiveLambdasQuery = 'select lambdaName, LambdaConfiguration.size as size, '
    + 'timeout, runtime, codeSize, '
    + 'sum(averageDuration * invocations) / 100 * LambdaPrice.price as cost from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by cost desc '
    + 'limit 5'

  const lambdas = await connection.query(getMostExpensiveLambdasQuery, [tenantId, tenantId, daysAgo])

  const getMostExpensiveLambdasDataPointsQuery = 'select lambdaName, '
    + (groupDaily ? 'sum(averageDuration * invocations) / 100 * LambdaPrice.price as cost, '
      : 'averageDuration * invocations / 100 * LambdaPrice.price as cost, ')
    + (groupDaily ? 'DATE(`dateTime`) as `dateTime`' : '`dateTime` ')
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'and lambdaName in (?) '
    + (groupDaily ? 'group by lambdaName, DATE(dateTime) order by DATE(dateTime) asc' : 'order by dateTime asc')

  const dataPoints = await connection.query(
    getMostExpensiveLambdasDataPointsQuery,
    [tenantId, tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}
