process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'

// eslint-disable-next-line import/first
import { getTotals } from './data-collectors'

describe('collectors', async () => {
  jest.setTimeout(30000)

  test('totals', async () => {
    const totals = await getTotals('emarketeer')

    expect(totals.invocations).toBeTruthy()
  })
})
