import { handler } from './update-tenant-lambda-stats'

process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

describe('Token Methods', async () => {
  jest.setTimeout(30000)

  test('happy path', async () => {
    try {
      const result = await handler({
        accessKey: 'AKIAJI7Y7EUA4WTJYTUA',
        region: 'eu-west-1',
        secretKey: '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',
        tenantId: 'emarketeer',
      })
    } catch (err) {
      console.log(err)
    }
  })
})
