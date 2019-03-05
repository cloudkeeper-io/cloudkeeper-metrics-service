import { getTotals } from './data-collectors'

process.env.dbName = 'cloudkeeper'
process.env.dbHost = 'cloudkeeper.cluster-ckbplh6wfiop.eu-central-1.rds.amazonaws.com'
process.env.dbUser = 'cloudkeeper'
process.env.dbPassword = 'ExH58GwqZBnCV49MqWcV'


describe('collectors', async () => {
  jest.setTimeout(30000)

  test('totals', async () => {
    try {
      const totals = await getTotals('emarketeer')

      expect(totals.totals.invocations).toBeTruthy()
    } catch (err) {
      console.log(err)
    }
  })
})
