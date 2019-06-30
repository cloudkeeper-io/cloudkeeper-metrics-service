process.env.dbName = 'cloudkeeper_dev'
process.env.dbHost = 'cloudkeeper-dev.ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = '2IS27ARwkqv5PaKEnGeU7taREet5UPxx'
process.env.AWS_REGION = 'eu-central-1'
process.env.finishedTopic = 'arn:aws:sns:eu-central-1:537011205135:dev-finished-updating-dynamo-stats'

// eslint-disable-next-line import/first
import { handler } from './update-tenant-dynamo-stats'

describe('Update Dynamo Stats', async () => {
  jest.setTimeout(60000)

  // TODO: refactor to be a functional test
  test.skip('happy path', async () => {
    await handler({
      accessKey: 'AKIAJI7Y7EUA4WTJYTUA',
      region: 'eu-west-1',
      secretKey: '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',
      id: 'emarketeer',
    })
  })
})
