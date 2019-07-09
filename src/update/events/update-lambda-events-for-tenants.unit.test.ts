process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'
process.env.AWS_REGION = 'eu-central-1'
process.env.finishedTopic = 'arn:aws:sns:eu-central-1:537011205135:dev-finished-updating-lambda-stats'
process.env.stage = 'dev'

// eslint-disable-next-line import/first
import { handler } from './update-lambda-events-for-tenant'

describe('Update Lambda Stats', async () => {
  jest.setTimeout(600000)

  test('happy path', async () => {
    await handler({
      Records: [{
        Sns: {
          Message: '7ec85367-20e1-40f2-8725-52b245354045',
        },
      }],
    })
  })
})
