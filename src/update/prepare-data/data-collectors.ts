/* eslint-disable prefer-template */
import { groupBy, map, reduce } from 'lodash'
import { getConnection } from '../../db/db'


const getDateCondition = (groupDaily) => {
  if (groupDaily) {
    return '(DATE(`dateTime`) > DATE(UTC_TIMESTAMP()) - INTERVAL ? DAY) '
  }
  return '(`dateTime` >= UTC_TIMESTAMP()  - INTERVAL ? DAY - INTERVAL 1 HOUR) '
}

export const getTotals = async (tenantId, daysAgo, groupDaily = false) => {
  const connection = await getConnection()

  const totalsQuery = 'select sum(invocations) as invocations, sum(`errors`) as `errors`, `dateTime`, '
    + 'sum(averageDuration * invocations / 100 * LambdaPrice.price) as cost, '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where tenantId = ? and  '
    + getDateCondition(false)
    + 'group by dateTime '
    + 'order by dateTime asc'

  const totalsQueryDaily = 'select '
    + 'sum(invocations) as invocations, '
    + 'sum(`errors`) as `errors`, '
    + 'DATE(`dateTime`) as `dateTime`, '
    + 'sum(averageDuration * invocations / 100 * LambdaPrice.price) as cost, '
    + 'from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'from LambdaStats '
    + 'where tenantId = ? and '
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
    + 'lambdaName, '
    + 'sum(averageDuration * invocations) / sum(invocations) as `averageDuration` '
    + 'from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `averageDuration` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  const getSlowestLambdasDataPointsQuery = 'select lambdaName, averageDuration, maxDuration, dateTime from LambdaStats '
    + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) and lambdaName in (?) '
    + 'order by dateTime asc'

  const getSlowestLambdasDataPointsQueryGroupingByDay = 'select '
    + 'lambdaName, '
    + 'sum(averageDuration * invocations) / sum(invocations) as `averageDuration`, '
    + 'max(maxDuration) as `maxDuration`, '
    + 'DATE(dateTime) as `dateTime` from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + 'and lambdaName in (?) '
    + 'group by lambdaName, DATE(`dateTime`) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getSlowestLambdasDataPointsQueryGroupingByDay : getSlowestLambdasDataPointsQuery,
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

  const getMostInvokedLambdasQuery = 'select lambdaName, sum(invocations) as `invocations` from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `invocations` desc '
    + 'limit 5'

  const lambdas = await connection.query(getMostInvokedLambdasQuery, [tenantId, daysAgo])

  const getMostInvokedLambdasDataPointsQuery = 'select lambdaName, invocations, dateTime from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(false)
    + ' and lambdaName in (?) '
    + 'order by dateTime asc'

  const getMostInvokedLambdasDataPointsDailyQuery = 'select lambdaName, '
    + 'sum(invocations) as invocations, DATE(dateTime) as dateTime from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + ' and lambdaName in (?) '
    + 'group by lambdaName, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostInvokedLambdasDataPointsDailyQuery : getMostInvokedLambdasDataPointsQuery,
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

  const getSlowestLambdasQuery = 'select lambdaName, sum(errors) as `errors` from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'group by lambdaName '
    + 'order by `errors` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  const getMostErrorsDataPointsQuery = 'select lambdaName, errors, dateTime from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(false)
    + 'and lambdaName in (?) '
    + 'order by dateTime asc'

  const getMostErrorsDailyDataPointsQuery = 'select lambdaName, sum(errors) as errors, DATE(dateTime) as dateTime '
    + 'from LambdaStats '
    + 'where tenantId = ? and '
    + getDateCondition(true)
    + 'and lambdaName in (?) '
    + 'group by lambdaName, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostErrorsDailyDataPointsQuery : getMostErrorsDataPointsQuery,
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

  const getMostExpensiveLambdasQuery = 'select lambdaName, '
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
    + 'averageDuration * invocations / 100 * LambdaPrice.price as cost, '
    + '`dateTime` from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'and lambdaName in (?) '
    + 'order by dateTime asc'

  const getMostExpensiveLambdasDataPointsDailyQuery = 'select lambdaName, '
    + 'sum(averageDuration * invocations) / 100 * LambdaPrice.price as cost, '
    + 'DATE(`dateTime`) as `dateTime` from LambdaStats '
    + 'join LambdaConfiguration '
    + 'on LambdaStats.lambdaName = LambdaConfiguration.name and LambdaConfiguration.tenantId = ? '
    + 'join LambdaPrice on LambdaPrice.size = LambdaConfiguration.size '
    + 'where LambdaStats.tenantId = ? and '
    + getDateCondition(groupDaily)
    + 'and lambdaName in (?) '
    + 'group by lambdaName, DATE(dateTime) '
    + 'order by DATE(dateTime) asc'

  const dataPoints = await connection.query(
    groupDaily ? getMostExpensiveLambdasDataPointsDailyQuery : getMostExpensiveLambdasDataPointsQuery,
    [tenantId, tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}
