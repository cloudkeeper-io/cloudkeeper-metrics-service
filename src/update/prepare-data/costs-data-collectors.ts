import { chain, groupBy, sumBy } from 'lodash'
import { DateTime } from 'luxon'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsWithDates } from './common'
import { mapDataPoints, queryForArray } from '../../db/db.utils'

export const getCostsPerService = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select serviceName, cast(\`date\` as char) as \`dateTime\`, sum(unblendedCost) as unblendedCost
                  from CostData
                  where tenantId = ? and unblendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by serviceName, \`date\`
                  order by \`date\` asc, unblendedCost desc`

  const result = await queryForArray(connection, query, [tenantId, startDate, endDate])

  const fixedDataPoints = mapDataPoints(result)

  const dateMap = groupBy(fixedDataPoints, dataPoint => dataPoint.dateTime.getTime())

  const dataPoints = chain(dateMap)
    .map((serviceCosts, dateTime) => ({
      dateTime: DateTime.fromMillis(Number(dateTime)).toJSDate(),
      total: sumBy(serviceCosts, 'unblendedCost'),
      serviceCosts,
    }))
    .orderBy(['dateTime'], ['asc'])
    .value()

  const startDateTime = DateTime.fromISO(startDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')
  const endDateTime = DateTime.fromISO(endDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')

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
                  order by \`dateTime\` asc, unblendedCost desc, serviceName desc`

  const result = await queryForArray(connection, query, [tenantId, serviceName, startDate, endDate])

  const fixedDataPoints = mapDataPoints(result)

  const startDateTime = DateTime.fromISO(startDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')
  const endDateTime = DateTime.fromISO(endDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')

  const dataPoints = fillEmptyDataPointsWithDates(fixedDataPoints, true, startDateTime, endDateTime, {
    cost: 0,
    serviceName,
  })

  return dataPoints
}

export const getCostsPerStack = async (tenantId, startDate, endDate) => {
  const connection = await getConnection()

  const query = `select stackName, cast(\`date\` as char) as \`dateTime\`, sum(unblendedCost) as unblendedCost
                  from CostData
                  where tenantId = ? and unblendedCost > 0 and \`date\` >= ? and \`date\` <= ?
                  group by stackName, \`date\`
                  order by \`date\` asc, unblendedCost desc, stackName desc`

  const result = await queryForArray(connection, query, [tenantId, startDate, endDate])

  const fixedDataPoints = mapDataPoints(result)

  const dateMap = groupBy(fixedDataPoints, dataPoint => dataPoint.dateTime.getTime())

  const dataPoints = chain(dateMap)
    .map((stackCosts, dateTime) => ({
      dateTime: DateTime.fromMillis(Number(dateTime)).toJSDate(),
      total: sumBy(stackCosts, 'unblendedCost'),
      stackCosts,
    }))
    .orderBy(['dateTime'], ['asc'])
    .value()

  const startDateTime = DateTime.fromISO(startDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')
  const endDateTime = DateTime.fromISO(endDate, { setZone: true }).setZone('utc', { keepLocalTime: true }).startOf('day')

  const filledDataPoints = fillEmptyDataPointsWithDates(dataPoints, true, startDateTime, endDateTime, {
    total: 0,
    stackCosts: [],
  })

  return filledDataPoints.map(item => ({
    ...item,
    date: DateTime.fromJSDate(item.dateTime).startOf('second').toISODate(),
  }))
}
