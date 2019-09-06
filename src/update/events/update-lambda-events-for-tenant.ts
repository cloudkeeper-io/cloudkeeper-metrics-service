import { filter, takeRight, groupBy, chunk, round, get, chain } from 'lodash'
import { Point } from '@azure/cognitiveservices-anomalydetector/lib/models'
import { DateTime } from 'luxon'
import { getAnomalyRrcfData } from './events.utils'
import { Event } from '../../entity'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsInTimeseries, getDateCondition } from '../prepare-data/common'
import { msToDuration } from '../../utils/time.utils'
import { generateMessage, setProcessingIsDone } from './common'
import { getDynamo } from '../../utils/aws.utils'

const analyzeTimeSeries = async (timeSeries: Point[], startDateTime: DateTime, endDateTime: DateTime,
  lambdaName: string, dimensionName: string, tenantId: string, fillIn = true, formatValue = value => value,
  minimalDifference = 0, useAverageInMessage = false) => {
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
    dataPoint => dataPoint.isAnomaly
      && dataPoint.value !== 0
      && Math.abs(dataPoint.value - average) > minimalDifference)

  return anomalies.map(anomaly => ({
    tenantId,
    serviceName: 'AWS Lambda',
    dimension: dimensionName,
    value: anomaly.value,
    expectedValue: null,
    dateTime: anomaly.timestamp,
    message: generateMessage(
      `${lambdaName} ${dimensionName.toLowerCase()}`,
      anomaly.value,
      useAverageInMessage ? average : 0,
      formatValue,
    ),
  }))
}

export const analyzeLambda = async (lambdaName, metrics, startDateTime, endDateTime, tenantId, newEvents: any[]) => {
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
    true,
    x => x,
    10,
    true,
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
    true,
    x => x,
    1,
    true,
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
    100,
    true,
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
    await Promise.all(lambdasChunk.map(lambdaName => analyzeLambda(
      lambdaName,
      metricsMap[lambdaName],
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

    await addLambdaEvents(tenant.id, newEvents)

    if (newEvents.length > 0) {
      await connection.createQueryBuilder()
        .insert()
        .into(Event)
        .values(newEvents)
        .orIgnore()
        .execute()
    }

    if (!get(tenant, 'initialProcessing.lambda')) {
      await dynamo.update({
        TableName: `${process.env.stage}-cloudkeeper-tenants`,
        Key: {
          id: tenant.id,
        },
        UpdateExpression: 'SET initialProcessing.lambda = :true',
        ExpressionAttributeValues: {
          ':true': true,
        },
      }).promise()

      await setProcessingIsDone(tenant.id, dynamo)
    }
  }))
}
