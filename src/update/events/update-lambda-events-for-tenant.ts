import { filter, takeRight, groupBy, chunk, round } from 'lodash'
import { Point } from '@azure/cognitiveservices-anomalydetector/lib/models'
import { DateTime } from 'luxon'
import { getAnomalyRrcfData } from './events.utils'
import { Event } from '../../entity'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsInTimeseries, getDateCondition } from '../prepare-data/common'
import { msToDuration } from '../../utils/time.utils'

const analyzeTimeSeries = async (timeSeries: Point[], startDateTime: DateTime, endDateTime: DateTime,
  lambdaName: string, dimensionName: string, tenantId: string, fillIn = true, formatValue = value => value) => {
  let dataPoints: Point[]

  if (fillIn) {
    dataPoints = fillEmptyDataPointsInTimeseries(timeSeries, false, startDateTime, endDateTime, {
      value: 0,
    })
  } else {
    dataPoints = timeSeries
  }

  const anomalyDetectionResults = await getAnomalyRrcfData(dataPoints)

  const anomalies = filter(takeRight(anomalyDetectionResults, 10),
    dataPoint => dataPoint.isAnomaly && dataPoint.value !== 0)

  return anomalies.map(anomaly => ({
    tenantId,
    serviceName: 'AWS Lambda',
    dimension: dimensionName,
    value: anomaly.value,
    expectedValue: null,
    dateTime: anomaly.timestamp,
    message: `Anomalous ${dimensionName.toLowerCase()} of ${lambdaName}: ${formatValue(anomaly.value)}`,
  }))
}

const analyzeLambda = async (lambdaName, metrics, startDateTime, endDateTime, tenantId, newEvents: any[]) => {
  const timeSeries = metrics.reduce((acc, point) => {
    acc.invocations.push({
      value: point.invocations,
      timestamp: point.dateTime,
    })

    acc.errors.push({
      value: point.errors,
      timestamp: point.dateTime,
    })

    acc.averageDuration.push({
      value: round(point.averageDuration, 2),
      timestamp: point.dateTime,
    })

    return acc
  }, {
    invocations: [],
    errors: [],
    averageDuration: [],
  })

  const invocationAnomalies = await analyzeTimeSeries(
    timeSeries.invocations,
    startDateTime,
    endDateTime,
    lambdaName,
    'Invocations',
    tenantId,
  )

  if (invocationAnomalies.length > 0) {
    newEvents.push(...invocationAnomalies)
  }

  const errorsAnomalies = await analyzeTimeSeries(
    timeSeries.errors,
    startDateTime,
    endDateTime,
    lambdaName,
    'Errors',
    tenantId,
  )

  if (errorsAnomalies.length > 0) {
    newEvents.push(...errorsAnomalies)
  }

  const avgDurationAnomalies = await analyzeTimeSeries(
    timeSeries.averageDuration,
    startDateTime,
    endDateTime,
    lambdaName,
    'Average Duration',
    tenantId,
    false,
    msToDuration,
  )

  if (avgDurationAnomalies.length > 0) {
    newEvents.push(...avgDurationAnomalies)
  }
}

const addLambdaEvents = async (tenantId, newEvents: any[]) => {
  const connection = await getConnection()

  const metrics = await connection.query(`
    select * from LambdaStats \
    where LambdaStats.tenantId = ? \
    and ${getDateCondition(false, '7')} \
    order by dateTime ASC
    `, [tenantId])

  const startDateTime = DateTime.utc().minus({ days: 7, hour: 1 }).startOf('hour')
  const endDateTime = DateTime.utc().minus({ hour: 1 }).startOf('hour')

  const metricsMap = groupBy(metrics, 'lambdaName')

  const lambdaNames = Object.keys(metricsMap)

  const chunks = chunk(lambdaNames, 10)

  for (const lambdasChunk of chunks) {
    await Promise.all(lambdasChunk.map(lambdaName => analyzeLambda(lambdaName, metricsMap[lambdaName], startDateTime, endDateTime, tenantId, newEvents)))
  }
}

export const handler = async (event) => {
  const connection = await getConnection()

  await Promise.all(event.Records.map(async (record) => {
    const tenant = JSON.parse(record.Sns.Message)

    console.log(`Working on tenant ${tenant.id}`)
    const newEvents: any[] = []

    await addLambdaEvents(tenant.id, newEvents)

    console.log(JSON.stringify(newEvents))

    if (newEvents.length > 0) {
      await connection.createQueryBuilder()
        .insert()
        .into(Event)
        .values(newEvents)
        .orIgnore()
        .execute()
    }
  }))
}
