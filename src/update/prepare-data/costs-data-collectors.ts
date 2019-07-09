import { chain, groupBy, sumBy } from 'lodash'
import { DateTime } from 'luxon'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsWithDates } from './common'

export const getCostsPerService = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select serviceName, cast(\`date\` as char) as \`date\`, sum(unblendedCost) as unblendedCost
                  from CostData
                  where tenantId = ? and unblendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by serviceName, \`date\`
                  order by \`date\` asc, unblendedCost desc`

  const result = await connection.query(query, [tenantId, startDate, endDate])

  const dateMap = groupBy(result, 'date')

  const dataPoints = chain(dateMap)
    .map((serviceCosts, date) => ({
      dateTime: DateTime.fromISO(date, { zone: 'utc' }).toJSDate(),
      total: sumBy(serviceCosts, 'unblendedCost'),
      serviceCosts,
    }))
    .orderBy(['date'], ['asc'])
    .value()

  const startDateTime = DateTime.fromISO(startDate, { zone: 'utc' }).minus({ days: 1 }).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate, { zone: 'utc' }).startOf('hour')

  const filledDataPoints = fillEmptyDataPointsWithDates(dataPoints, true, startDateTime, endDateTime, {
    total: 0,
    serviceCosts: [],
  })

  return filledDataPoints.map(item => ({
    ...item,
    date: DateTime.fromJSDate(item.dateTime).startOf('second').toISODate(),
  }))
}

export const getCostsForService = async (tenantId, serviceName, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select serviceName, \`date\` as \`dateTime\`, sum(unblendedCost) as cost
                  from CostData
                  where tenantId = ? and serviceName = ? and unblendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by serviceName, \`dateTime\`
                  order by \`dateTime\` asc, unblendedCost desc`

  const result = await connection.query(query, [tenantId, serviceName, startDate, endDate])

  const startDateTime = DateTime.fromISO(startDate, { zone: 'utc' }).minus({ days: 1 }).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate, { zone: 'utc' }).startOf('hour')

  const dataPoints = fillEmptyDataPointsWithDates(result, true, startDateTime, endDateTime, {
    cost: 0,
    serviceName,
  })

  return dataPoints
}

export const getCostsPerStack = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select stackName, cast(\`date\` as char) as \`date\`, sum(unblendedCost) as unblendedCost
                  from CostData
                  where tenantId = ? and unblendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by stackName, \`date\`
                  order by \`date\` asc, unblendedCost desc`

  const result = await connection.query(query, [tenantId, startDate, endDate])

  const dateMap = groupBy(result, 'date')

  const dataPoints = chain(dateMap)
    .map((stackCosts, date) => ({
      dateTime: DateTime.fromISO(date, { zone: 'utc' }).toJSDate(),
      total: sumBy(stackCosts, 'unblendedCost'),
      stackCosts,
    }))
    .orderBy(['date'], ['asc'])
    .value()

  const startDateTime = DateTime.fromISO(startDate, { zone: 'utc' }).minus({ days: 1 }).startOf('hour')
  const endDateTime = DateTime.fromISO(endDate, { zone: 'utc' }).startOf('hour')

  const filledDataPoints = fillEmptyDataPointsWithDates(dataPoints, true, startDateTime, endDateTime, {
    total: 0,
    stackCosts: [],
  })

  return filledDataPoints.map(item => ({
    ...item,
    date: DateTime.fromJSDate(item.dateTime).startOf('second').toISODate(),
  }))
}
