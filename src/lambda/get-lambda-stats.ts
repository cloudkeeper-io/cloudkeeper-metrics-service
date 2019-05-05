import { reduce } from 'lodash'
import { DateTime } from 'luxon'
import { getConnection } from '../db/db'
import { fillEmptyDataPointsWithDates } from '../update/prepare-data/common'

export const handler = async (request) => {
  const { name, region, tenantId, startDate, endDate } = request

  const connection = await getConnection()

  const dataPoints = await connection.query(`select * from LambdaStats where tenantId = ? and 
        lambdaName = ? and region = ? and dateTime >= ? and dateTime <= ?`,
  [tenantId, name, region, startDate, endDate])

  const startDateTime = DateTime.fromISO(startDate).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate).startOf('hour')

  const fullDataPoints = fillEmptyDataPointsWithDates(dataPoints, false, startDateTime, endDateTime, {
    errors: 0,
    averageDuration: 0,
    invocations: 0,
    maxDuration: 0,
    lambdaName: name,
    region,
  })

  const totals = reduce(fullDataPoints, (acc, dataPoint) => {
    acc.totalInvocations += Number(dataPoint.invocations)
    acc.totalErrors += Number(dataPoint.errors)
    acc.totalExecutionTime += Number(dataPoint.invocations) * Number(dataPoint.averageDuration)

    return acc
  }, {
    totalInvocations: 0,
    totalErrors: 0,
    totalExecutionTime: 0,
  })

  return {
    totalInvocations: totals.totalInvocations,
    totalErrors: totals.totalErrors,
    averageDuration: totals.totalExecutionTime / totals.totalInvocations,
    dataPoints: fullDataPoints,
  }
}
