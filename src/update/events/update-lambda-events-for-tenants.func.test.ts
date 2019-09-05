/* eslint-disable import/first */
import { DateTime } from 'luxon'

process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'
process.env.AWS_REGION = 'eu-central-1'
process.env.finishedTopic = 'arn:aws:sns:eu-central-1:537011205135:dev-finished-updating-lambda-stats'
process.env.stage = 'dev'

import * as lambdaMetrics from './sample-lambda-metrics.json'
import { analyzeLambda, handler } from './update-lambda-events-for-tenant'

describe('Update Lambda Events', () => {
  jest.setTimeout(600000)

  test.skip('happy path', async () => {
    await handler({
      Records: [{
        Sns: {
          Message: '7ec85367-20e1-40f2-8725-52b245354045',
        },
      }],
    })
  })

  test('Analyze Lambda', async () => {
    const startDateTime = DateTime.fromISO('2019-08-29T14:00:00.000Z')
    const endDateTime = DateTime.fromISO('2019-09-05T14:00:00.000Z')

    const newEvents = []

    await analyzeLambda(
      'company-service-dev-get-leads-feed',
      lambdaMetrics.map((dataPoint => ({
        ...dataPoint,
        dateTime: DateTime.fromISO(dataPoint.dateTime).toJSDate(),
      }))),
      startDateTime,
      endDateTime,
      '7ec85367-20e1-40f2-8725-52b245354045',
      newEvents,
    )

    expect(newEvents.length).toBeGreaterThanOrEqual(2)
  })
})
