import { reduce, groupBy, map } from 'lodash'
import { getConnection } from '../../db/db'

export const getTotals = async (tenantId, daysAgo) => {
  const connection = await getConnection()

  const totalsQuery = 'select sum(invocations) as invocations, sum(`errors`) as `errors`, `dateTime` from LambdaStats '
    + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP()  - INTERVAL ? DAY - INTERVAL 1 HOUR) '
    + 'group by dateTime '
    + 'order by dateTime asc'

  const dataPoints = await connection.query(totalsQuery, [tenantId, daysAgo])

  const totals = reduce(dataPoints, (acc, datapoint) => {
    acc.invocations += Number(datapoint.invocations)
    acc.errors += Number(datapoint.errors)

    return acc
  }, { invocations: 0, errors: 0 })

  return {
    dataPoints,
    ...totals,
  }
}

export const getSlowestLambdas = async (tenantId, daysAgo) => {
  const connection = await getConnection()

  const getSlowestLambdasQuery = 'select lambdaName, avg(averageDuration) as `averageDuration` from LambdaStats '
    + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) '
    + 'group by lambdaName '
    + 'order by `averageDuration` desc '
    + 'limit 5'

  const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

  const getSlowestLambdasDataPointsQuery = 'select lambdaName, averageDuration, maxDuration, dateTime from LambdaStats '
    + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) and lambdaName in (?) '
    + 'order by dateTime asc'

  const dataPoints = await connection.query(
    getSlowestLambdasDataPointsQuery,
    [tenantId, daysAgo, map(lambdas, 'lambdaName')],
  )

  const dataPointsMap = groupBy(dataPoints, 'lambdaName')

  return map(lambdas, lambda => ({
    ...lambda,
    dataPoints: dataPointsMap[lambda.lambdaName],
  }))
}

export const getMostInvokedLambdas = async (tenantId, daysAgo) => {
    const connection = await getConnection()

    const getSlowestLambdasQuery = 'select lambdaName, sum(invocations) as `invocations` from LambdaStats '
        + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) '
        + 'group by lambdaName '
        + 'order by `invocations` desc '
        + 'limit 5'

    const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

    const getSlowestLambdasDataPointsQuery = 'select lambdaName, invocations, dateTime from LambdaStats '
        + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) and lambdaName in (?) '
        + 'order by dateTime asc'

    const dataPoints = await connection.query(
        getSlowestLambdasDataPointsQuery,
        [tenantId, daysAgo, map(lambdas, 'lambdaName')],
    )

    const dataPointsMap = groupBy(dataPoints, 'lambdaName')

    return map(lambdas, lambda => ({
        ...lambda,
        dataPoints: dataPointsMap[lambda.lambdaName],
    }))
}

export const getMostErrorsLambdas = async (tenantId, daysAgo) => {
    const connection = await getConnection()

    const getSlowestLambdasQuery = 'select lambdaName, sum(errors) as `errors` from LambdaStats '
        + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) '
        + 'group by lambdaName '
        + 'order by `errors` desc '
        + 'limit 5'

    const lambdas = await connection.query(getSlowestLambdasQuery, [tenantId, daysAgo])

    const getSlowestLambdasDataPointsQuery = 'select lambdaName, errors, dateTime from LambdaStats '
        + 'where tenantId = ? and (`dateTime` >= UTC_TIMESTAMP() - INTERVAL ? DAY - INTERVAL 1 HOUR) and lambdaName in (?) '
        + 'order by dateTime asc'

    const dataPoints = await connection.query(
        getSlowestLambdasDataPointsQuery,
        [tenantId, daysAgo, map(lambdas, 'lambdaName')],
    )

    const dataPointsMap = groupBy(dataPoints, 'lambdaName')

    return map(lambdas, lambda => ({
        ...lambda,
        dataPoints: dataPointsMap[lambda.lambdaName],
    }))
}
