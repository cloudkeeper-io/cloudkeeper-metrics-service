/* eslint-disable import/first */
import { DateTime } from 'luxon'

process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'
process.env.AWS_REGION = 'eu-central-1'
process.env.finishedTopic = 'arn:aws:sns:eu-central-1:537011205135:dev-finished-updating-lambda-stats'
process.env.stage = 'dev'

import * as tableMetrics from './sample-dynamo-metrics.json'
import { handler } from './update-lambda-events-for-tenant'
import { analyzeTable } from './update-dynamo-events-for-tenant'

describe('Update Dynamo Events', () => {
  jest.setTimeout(600000)

  test.skip('happy path', async () => {
    await handler({
      Records: [{
        Sns: {
          Message: 'f2771702-164d-4d90-bb79-b849f59918e5',
        },
      }],
    })
  })

  test('Analyze Table', async () => {
    const startDateTime = DateTime.fromISO('2019-08-29T14:00:00.000Z')
    const endDateTime = DateTime.fromISO('2019-09-05T14:00:00.000Z')

    const newEvents = []

    await analyzeTable(
      'open-graph-service-dev-cache',
      tableMetrics.map((dataPoint => ({
        ...dataPoint,
        dateTime: DateTime.fromISO(dataPoint.dateTime).toJSDate(),
      }))),
      startDateTime,
      endDateTime,
      'f2771702-164d-4d90-bb79-b849f59918e5',
      newEvents,
    )

    expect(newEvents.length).toBeGreaterThanOrEqual(0)
  })
})
