import { groupBy, chunk, round, get, chain, map } from 'lodash'
import { DateTime } from 'luxon'
import { Event } from '../../entity'
import { getConnection } from '../../db/db'
import { fillEmptyDataPointsInTimeseries, getDateCondition } from '../prepare-data/common'
import { msToDuration } from '../../utils/time.utils'
import { findAnomaliesInTimeSeries, generateMessage, setProcessingIsDone } from './common'
import { getDynamo } from '../../utils/aws.utils'
import { mapDataPoints, queryForArray } from '../../db/db.utils'

const mapAnomalyToEvent = (tenantId, lambdaName, dimensionName, average: number | undefined = undefined, formatValue = x => x) => anomaly => ({
  tenantId,
  serviceName: 'AWS Lambda',
  dimension: dimensionName,
  value: anomaly.value,
  expectedValue: null,
  dateTime: anomaly.timestamp,
  message: generateMessage(
    `${lambdaName} ${dimensionName.toLowerCase()}`,
    anomaly.value,
    average,
    formatValue,
  ),
})

const calculateAverage = fullDataPoints => chain(fullDataPoints).map(x => Number(x.value)).sum().value() / fullDataPoints.length

const addInvocationEvents = async (timeSeries, startDateTime, endDateTime, lambdaName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(timeSeries, false, startDateTime, endDateTime, {
    value: 0,
  })

  const average = calculateAverage(fullDataPoints)

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints, (dataPoint => Math.abs(dataPoint.value - average) > 10))

  const events = map(anomalies, mapAnomalyToEvent(tenantId, lambdaName, 'Invocations', average))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

const addErrorEvents = async (timeSeries, startDateTime, endDateTime, lambdaName, tenantId, newEvents: any[]) => {
  const fullDataPoints = fillEmptyDataPointsInTimeseries(timeSeries, false, startDateTime, endDateTime, {
    value: 0,
  })

  const average = calculateAverage(fullDataPoints)

  const anomalies = await findAnomaliesInTimeSeries(fullDataPoints, (dataPoint => Math.abs(dataPoint.value - average) > 1))

  const events = map(anomalies, mapAnomalyToEvent(tenantId, lambdaName, 'Errors', average))

  if (events.length > 0) {
    newEvents.push(...events)
  }
}

const addDurationEvents = async (timeSeries, startDateTime, endDateTime, lambdaName, tenantId, newEvents: any[]) => {
  const average = calculateAverage(timeSeries)

  const anomalies = await findAnomaliesInTimeSeries(timeSeries, (dataPoint => Math.abs(dataPoint.value - average) > 100))

  const events = map(anomalies, mapAnomalyToEvent(tenantId, lambdaName, 'Average Duration', average, msToDuration))

  if (events.length > 0) {
    newEvents.push(...events)
  }
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

  await addInvocationEvents(timeSeries.invocations, startDateTime, endDateTime, lambdaName, tenantId, newEvents)

  await addErrorEvents(timeSeries.errors, startDateTime, endDateTime, lambdaName, tenantId, newEvents)

  await addDurationEvents(timeSeries.averageDuration, startDateTime, endDateTime, lambdaName, tenantId, newEvents)
}

const addLambdaEvents = async (tenantId, newEvents: any[]) => {
  const connection = await getConnection()

  const metrics = await queryForArray(connection,
    `select * from LambdaStats \
    where LambdaStats.tenantId = ? \
    and ${getDateCondition(false, '7')} \
    order by dateTime ASC, LambdaStats.lambdaName ASC
    `, [tenantId])

  const fixedMetrics = mapDataPoints(metrics)

  const startDateTime = DateTime.utc().minus({ days: 7, hour: 1 }).startOf('hour')
  const endDateTime = DateTime.utc().minus({ hour: 1 }).startOf('hour')

  const metricsMap = groupBy(fixedMetrics, 'lambdaName')

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
