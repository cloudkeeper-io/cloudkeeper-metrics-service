import { filter, get, last, takeRight, round } from 'lodash'
import { DateTime } from 'luxon'
import { getAnomalyData } from './events.utils'
import { Event } from '../../entity'
import { getConnection } from '../../db/db'
import { getCostsForService, getCostsPerService } from '../prepare-data/costs-data-collectors'
import { generateMessage, writeLatestEventsToS3 } from './common'

const addServiceCostAnomalies = async (tenantId, serviceName, newEvents) => {
  if (!serviceName) {
    return
  }

  const endDate = DateTime.utc().minus({ days: 1 }).startOf('second').toISODate()

  const startDate = DateTime.utc().minus({ days: 90 }).startOf('second').toISODate()

  const serviceCostData = await getCostsForService(tenantId, serviceName, startDate, endDate)

  const series = serviceCostData.map(item => ({
    timestamp: item.dateTime,
    value: Number(item.cost),
  }))

  const costAnomalyData = await getAnomalyData(series, 'daily')

  const costAnomalies = filter(takeRight(costAnomalyData, 10), dataPoint => dataPoint.isAnomaly && (Math.abs(dataPoint.expectedValue - dataPoint.value) > 1))

  newEvents.push(...costAnomalies.map(item => ({
    tenantId,
    serviceName,
    dimension: 'Billed Cost',
    value: item.value,
    expectedValue: item.expectedValue,
    dateTime: item.timestamp,
    message: generateMessage(`${serviceName} Billed Cost`, item.value, item.expectedValue, '$'),
  })))
}

const getCostsEvents = async (tenantId): Promise<any[]> => {
  const newEvents: any[] = []

  const endDate = DateTime.utc().minus({ days: 1 }).startOf('second').toISODate()

  const startDate = DateTime.utc().minus({ days: 90 }).startOf('second').toISODate()

  const costsData = await getCostsPerService(tenantId, startDate, endDate)

  const globalCostsData = costsData.map(item => ({
    timestamp: item.date,
    value: Number(item.total),
  }))

  const costAnomalyData = await getAnomalyData(globalCostsData, 'daily')

  const costAnomalies = filter(
    takeRight(costAnomalyData, 10),
    dataPoint => dataPoint.isAnomaly && (Math.abs(dataPoint.expectedValue - dataPoint.value) > 1),
  )

  newEvents.push(...costAnomalies.map(item => ({
    tenantId,
    serviceName: 'costs',
    dimension: 'Billed Cost',
    value: round(item.value, 2),
    expectedValue: round(item.expectedValue, 2),
    dateTime: item.timestamp,
    message: generateMessage('Billed Cost', item.value, item.expectedValue, '$'),
  })))

  const serviceCosts = get(last(costsData), 'serviceCosts')

  if (!serviceCosts) {
    return newEvents
  }

  for (const serviceCost of serviceCosts) {
    await addServiceCostAnomalies(tenantId, serviceCost.serviceName, newEvents)
  }

  return newEvents
}

export const handler = async (event) => {
  const connection = await getConnection()

  await Promise.all(event.Records.map(async (record) => {
    const tenant = JSON.parse(record.Sns.Message)

    console.log(`Working on tenant ${tenant.id}`)

    const newEvents: any[] = await getCostsEvents(tenant.id)

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
