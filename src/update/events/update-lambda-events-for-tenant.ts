import { filter, takeRight } from 'lodash'
import { getTotals } from '../prepare-data/lambda-data-collectors'
import { getAnomalyData } from './events.utils'
import { Event } from '../../entity'
import { getConnection } from '../../db/db'
import { generateMessage, writeLatestEventsToS3 } from './common'

const addLambdaEvents = async (tenantId, newEvents: any[]) => {
  const lambdaTotals = await getTotals(tenantId, 30, false)

  console.log('totals ', lambdaTotals)

  const invocationsDataPoints = lambdaTotals.dataPoints.map(item => ({
    timestamp: item.dateTime,
    value: Number(item.invocations),
  }))

  const invocationsAnomalyData = await getAnomalyData(invocationsDataPoints)

  const invocationsAnomalies = filter(takeRight(invocationsAnomalyData, 10), { isAnomaly: true })

  newEvents.push(...invocationsAnomalies.map(item => ({
    tenantId,
    serviceName: 'lambda',
    dimension: 'Lambda Invocations',
    // @ts-ignore
    value: item.value,
    // @ts-ignore
    expectedValue: item.expectedValue,
    // @ts-ignore
    dateTime: item.timestamp,
    // @ts-ignore
    message: generateMessage('Lambda Invocations', item.value, item.expectedValue),
  })))

  const errorsDataPoints = lambdaTotals.dataPoints.map(item => ({
    timestamp: item.dateTime,
    value: Number(item.errors),
  }))

  const errorsAnomalyData = await getAnomalyData(errorsDataPoints)

  const errorsAnomalies = filter(takeRight(errorsAnomalyData), { isAnomaly: true })

  newEvents.push(...errorsAnomalies.map(item => ({
    tenantId,
    serviceName: 'lambda',
    dimension: 'Lambda Errors',
    // @ts-ignore
    value: item.value,
    // @ts-ignore
    expectedValue: item.expectedValue,
    // @ts-ignore
    dateTime: item.timestamp,
    // @ts-ignore
    message: generateMessage('Lambda Errors', item.value, item.expectedValue),
  })))
}

export const handler = async (event) => {
  const connection = await getConnection()

  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    console.log(`Working on tenant ${tenantId}`)
    const newEvents: any[] = []

    await addLambdaEvents(tenantId, newEvents)

    if (newEvents.length > 0) {
      await connection.createQueryBuilder()
        .insert()
        .into(Event)
        .values(newEvents)
        .orIgnore()
        .execute()

      await writeLatestEventsToS3(connection, tenantId)
    }
  }))
}
