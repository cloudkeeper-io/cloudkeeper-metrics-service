process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'
process.env.AWS_REGION = 'eu-central-1'
process.env.finishedTopic = 'arn:aws:sns:eu-central-1:537011205135:dev-finished-updating-lambda-stats'

// eslint-disable-next-line import/first
import { handler } from './update-tenant-lambda-stats'

describe('Update Lambda Stats', async () => {
  jest.setTimeout(60000)

  // TODO: refactor to be a functional test
  test.skip('happy path', async () => {
    await handler({
      region: 'eu-west-1',
      roleArn: 'arn:aws:iam::377460527677:role/CloudkeeperDelegationRole',
      id: '8719b290-66f2-4138-ab35-67a3350dfb75',
    })
  })
})
