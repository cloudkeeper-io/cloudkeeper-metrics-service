import { DateTime } from 'luxon'
import { Point } from '@azure/cognitiveservices-anomalydetector/lib/models'
import { filter, takeRight, groupBy, chunk, get, chain } from 'lodash'

import { getConnection } from '../../db/db'
import { Event } from '../../entity'
import {generateMessageWithAverage, setProcessingIsDone} from './common'
import { fillEmptyDataPointsInTimeseries, getDateCondition } from '../prepare-data/common'
import { getAnomalyRrcfData } from './events.utils'
import { getDynamo } from '../../utils/aws.utils'

const analyzeTimeSeries = async (timeSeries: Point[], startDateTime: DateTime, endDateTime: DateTime,
  tableName: string, dimensionName: string, tenantId: string, fillIn = true) => {
  let dataPoints: Point[]

  if (fillIn) {
    dataPoints = fillEmptyDataPointsInTimeseries(timeSeries, false, startDateTime, endDateTime, {
      value: 0,
    })
  } else {
    dataPoints = timeSeries
  }

  const anomalyDetectionResults = await getAnomalyRrcfData(dataPoints)

  const average = chain(dataPoints).map(x => Number(x.value)).sum().value() / dataPoints.length

  const anomalies = filter(takeRight(anomalyDetectionResults, 10),
    dataPoint => dataPoint.isAnomaly && dataPoint.value !== 0 && Math.abs(dataPoint.value - average) > 1)

  return anomalies.map(anomaly => ({
    tenantId,
    serviceName: 'DynamoDB',
    dimension: dimensionName,
    value: anomaly.value,
    expectedValue: null,
    dateTime: anomaly.timestamp,
    message: generateMessageWithAverage(
      `${tableName} ${dimensionName.toLowerCase()}`,
      anomaly.value,
      average,
    ),
  }))
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
      value: point.throttledRead,
      timestamp: point.dateTime,
    })

    acc.throttledWrite.push({
      value: point.throttledWrite,
      timestamp: point.dateTime,
    })

    return acc
  }, {
    consumedRead: [],
    consumedWrite: [],
    throttledRead: [],
    throttledWrite: [],
  })

  const consumedReadAnomalies = await analyzeTimeSeries(
    timeSeries.consumedRead,
    startDateTime,
    endDateTime,
    tableName,
    'Consumed Read Capacity',
    tenantId,
  )

  if (consumedReadAnomalies.length > 0) {
    newEvents.push(...consumedReadAnomalies)
  }

  const consumedWriteAnomalies = await analyzeTimeSeries(
    timeSeries.consumedWrite,
    startDateTime,
    endDateTime,
    tableName,
    'Consumed Write Capacity',
    tenantId,
  )

  if (consumedWriteAnomalies.length > 0) {
    newEvents.push(...consumedWriteAnomalies)
  }

  const throttledReadsAnomalies = await analyzeTimeSeries(
    timeSeries.throttledRead,
    startDateTime,
    endDateTime,
    tableName,
    'Throttled Reads',
    tenantId,
    false,
  )

  if (throttledReadsAnomalies.length > 0) {
    newEvents.push(...throttledReadsAnomalies)
  }

  const throttledWritesAnomalies = await analyzeTimeSeries(
    timeSeries.throttledWrite,
    startDateTime,
    endDateTime,
    tableName,
    'Throttled Writes',
    tenantId,
    false,
  )

  if (throttledWritesAnomalies.length > 0) {
    newEvents.push(...throttledWritesAnomalies)
  }
}

const addDynamoEvents = async (tenantId, newEvents: any[]) => {
  const connection = await getConnection()

  const metrics = await connection.query(`
    select * from DynamoTableStats \
    where DynamoTableStats.tenantId = ? \
    and ${getDateCondition(false, '7')} \
    order by dateTime ASC
    `, [tenantId])

  const startDateTime = DateTime.utc().minus({ days: 7, hour: 1 }).startOf('hour')
  const endDateTime = DateTime.utc().minus({ hour: 1 }).startOf('hour')

  const metricsMap = groupBy(metrics, 'name')

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
