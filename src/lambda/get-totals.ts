import { DateTime } from 'luxon'
import { map, reduce } from 'lodash'
import { getConnection } from '../db/db'
import { fillEmptyDataPointsWithDates } from '../update/prepare-data/common'

export const handler = async ({ tenantId, startDate, endDate }) => {
  const connection = await getConnection()

  const dataPoints = await connection.query(`
    select sum(invocations) as invocations, sum(errors) as errors, sum(cost) as cost, dateTime
    from LambdaStats
    where tenantId = ? and dateTime >= ? and dateTime <=?
    group by dateTime order by dateTime asc
  `, [tenantId, startDate, endDate])

  const convertedDataPoints = map(dataPoints, dataPoint => ({
    invocations: Number(dataPoint.invocations),
    errors: Number(dataPoint.errors),
    cost: Number(dataPoint.cost),
    dateTime: dataPoint.dateTime,
  }))

  const fullDataPoints = fillEmptyDataPointsWithDates(
    convertedDataPoints,
    false,
    DateTime.fromISO(startDate).plus({ hours: 1 }).startOf('hour'),
    DateTime.fromISO(endDate).startOf('hour'),
    {
      invocations: 0,
      errors: 0,
      cost: 0,
    },
  )


  return reduce(fullDataPoints, (acc, dataPoint) => {
    acc.invocations += dataPoint.invocations
    acc.errors += dataPoint.errors
    acc.cost += dataPoint.cost
    return acc
  }, {
    invocations: 0,
    errors: 0,
    cost: 0,
    dataPoints: fullDataPoints,
  })
}
