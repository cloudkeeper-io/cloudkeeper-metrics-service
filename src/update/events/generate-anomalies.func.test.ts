/* eslint-disable import/first */

process.env.stage = 'dev'
process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'
process.env.AWS_REGION = 'eu-central-1'
process.env.azureClientId = 'd3c6485f-67f2-4290-9c3e-0cfa5cc8cfd3'
process.env.azureClientSecret = 'NmJ6eLJBvbRk7ZVwEazlGghPr8..8+q/'
process.env.azureDomain = 'f8433a82-a56c-44ae-a2f6-245b2650fe91'
process.env.azureSubscriptionId = 'f4703b5e552b484ca45f8b6333bee060'

import { DateTime } from 'luxon'
import { filter, takeRight } from 'lodash'
import * as fs from 'fs'
import * as path from 'path'
import { getCostsPerService } from '../prepare-data/costs-data-collectors'
import { getAnomalyData, getAnomalyRrcfData } from './events.utils'
import { generateMessage } from './common'

describe('Update Lambda Stats', async () => {
  jest.setTimeout(60000)

  // TODO: migrate into proper test

  test.skip('happy path', async () => {
    const endDate = DateTime.utc().minus({ days: 1 }).startOf('second').toISODate()

    const startDate = DateTime.utc().minus({ days: 90 }).startOf('second').toISODate()

    const costsData = await getCostsPerService('7ec85367-20e1-40f2-8725-52b245354045', startDate, endDate)

    const globalCostsData = costsData.map(item => ({
      timestamp: item.date,
      value: Number(item.total),
    }))

    const costAnomalyData = await getAnomalyData(globalCostsData, 'daily')

    const costAnomalies = filter(takeRight(costAnomalyData, 10), { isAnomaly: true })

    const events = costAnomalies.map(item => ({
      tenantId: '7ec85367-20e1-40f2-8725-52b245354045',
      serviceName: 'costs',
      dimension: 'Billed Cost',
      // @ts-ignore
      value: item.value,
      // @ts-ignore
      expectedValue: item.expectedValue,
      // @ts-ignore
      dateTime: item.timestamp,
      // @ts-ignore
      message: generateMessage('Billed Cost', item.value, item.expectedValue, '$'),
    }))

    console.log(events)
  })

  test('test rrcf events', async () => {
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'request.json')).toString('utf-8'))

    const result = await getAnomalyRrcfData(data)

    const anomalies = filter(result, { isAnomaly: true })

    expect(anomalies.length).toBeGreaterThanOrEqual(3)
  })
})
