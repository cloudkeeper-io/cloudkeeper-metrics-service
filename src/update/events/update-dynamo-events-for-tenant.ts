import { DateTime } from 'luxon'
import { groupBy, chunk, get, chain, map } from 'lodash'

import { getConnection } from '../../db/db'
import { Event } from '../../entity'
import { findAnomaliesInTimeSeries, generateMessage, setProcessingIsDone } from './common'
import { fillEmptyDataPointsInTimeseries, getDateCondition } from '../prepare-data/common'
import { getDynamo } from '../../utils/aws.utils'
import { mapDataPoints, queryForArray } from '../../db/db.utils'

const mapAnomalyToEvent = (tenantId, tableName, dimensionName, average: number | undefined = undefined) => anomaly => ({
  tenantId,
  serviceName: 'DynamoDB',
  dimension: dimensionName,
  value: anomaly.value,
  expectedValue: null,
  dateTime: anomaly.timestamp,
  message: generateMessage(
    `${tableName} ${dimensionName.toLowerCase()}`,
    anomaly.value,
    average,
  ),
})

const calculateAverage = fullDataPoints => chain(fullDataPoints).map(x => Number(x.value)).sum().value() / fullDataPoints.length

const addConsumedReadEvents = async (dataPoints, startDateTime, endDateTime, tableName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(dataPoints, false, startDateTime, endDateTime, {
    value: 0,
  })

  const average = calculateAverage(fullDataPoints)

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints, (dataPoint => Math.abs(dataPoint.value - average) > 10))

  const events = map(anomalies, mapAnomalyToEvent(tenantId, tableName, 'Consumed Read Capacity', average))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

const addConsumedWriteEvents = async (dataPoints, startDateTime, endDateTime, tableName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(dataPoints, false, startDateTime, endDateTime, {
    value: 0,
  })

  const average = calculateAverage(fullDataPoints)

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints, (dataPoint => Math.abs(dataPoint.value - average) > 10))

  const events = map(anomalies, mapAnomalyToEvent(tenantId, tableName, 'Consumed Write Capacity', average))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

const addThrottledReadEvents = async (dataPoints, startDateTime, endDateTime, tableName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(dataPoints, false, startDateTime, endDateTime, {
    value: 0,
  })

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints)

  const events = map(anomalies, mapAnomalyToEvent(tenantId, tableName, 'Throttled Reads'))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

const addThrottledWriteEvents = async (dataPoints, startDateTime, endDateTime, tableName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(dataPoints, false, startDateTime, endDateTime, {
    value: 0,
  })

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints)

  const events = map(anomalies, mapAnomalyToEvent(tenantId, tableName, 'Throttled Writes'))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

export const analyzeTable = async (tableName, metrics, startDateTime, endDateTime, tenantId, newEvents: any[]) => {
  const timeSeries = metrics.reduce((acc, point) => {
    acc.consumedRead.push({
      value: point.consumedRead,
      timestamp: point.dateTime,
    })

    acc.consumedWrite.push({
      value: point.consumedWrite,
      timestamp: point.dateTime,
    })

    acc.throttledRead.push({
      value: point.throttledReads,
      timestamp: point.dateTime,
    })

    acc.throttledWrite.push({
      value: point.throttledWrites,
      timestamp: point.dateTime,
    })

    return acc
  }, {
    consumedRead: [],
    consumedWrite: [],
    throttledRead: [],
    throttledWrite: [],
  })

  await addConsumedReadEvents(timeSeries.consumedRead, startDateTime, endDateTime, tableName, tenantId, newEvents)

  await addConsumedWriteEvents(timeSeries.consumedWrite, startDateTime, endDateTime, tableName, tenantId, newEvents)

  await addThrottledReadEvents(timeSeries.throttledRead, startDateTime, endDateTime, tableName, tenantId, newEvents)

  await addThrottledWriteEvents(timeSeries.throttledWrite, startDateTime, endDateTime, tableName, tenantId, newEvents)
}

const addDynamoEvents = async (tenantId, newEvents: any[]) => {
  const connection = await getConnection()

  const metrics = await queryForArray(connection, `
    select * from DynamoTableStats \
    where DynamoTableStats.tenantId = ? \
    and ${getDateCondition(false, '7')} \
    order by dateTime ASC, name DESC
    `, [tenantId])

  const fixedMetrics = mapDataPoints(metrics)

  const startDateTime = DateTime.utc().minus({ days: 7, hour: 1 }).startOf('hour')
  const endDateTime = DateTime.utc().minus({ hour: 1 }).startOf('hour')

  const metricsMap = groupBy(fixedMetrics, 'name')

  const tableNames = Object.keys(metricsMap)

  const chunks = chunk(tableNames, 10)

  for (const tablesChunk of chunks) {
    await Promise.all(tablesChunk.map(tableName => analyzeTable(
      tableName,
      metricsMap[tableName],
      startDateTime,
      endDateTime,
      tenantId,
      newEvents,
    )))
  }
}

const dynamo = getDynamo()

export const handler = async (event) => {
  const connection = await getConnection()

  await Promise.all(event.Records.map(async (record) => {
    const tenant = JSON.parse(record.Sns.Message)

    console.log(`Working on tenant ${tenant.id}`)
    const newEvents: any[] = []

    await addDynamoEvents(tenant.id, newEvents)

    console.log(JSON.stringify(newEvents))

    if (newEvents.length > 0) {
      await connection.createQueryBuilder()
        .insert()
        .into(Event)
        .values(newEvents)
        .orIgnore()
        .execute()
    }

    if (!get(tenant, 'initialProcessing.dynamo')) {
      await dynamo.update({
        TableName: `${process.env.stage}-cloudkeeper-tenants`,
        Key: {
          id: tenant.id,
        },
        UpdateExpression: 'SET initialProcessing.dynamo = :true',
        ExpressionAttributeValues: {
          ':true': true,
        },
      }).promise()

      await setProcessingIsDone(tenant.id, dynamo)
    }
  }))
}
