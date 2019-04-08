/* eslint-disable import/no-extraneous-dependencies */
import { listTables } from './dynamodb.util'

describe('dynamo data', () => {
  jest.setTimeout(30000)

  // TODO: fix to be able to run it

  test.skip('list tables - happy path', async () => {
    const tables = await listTables('test', 'arn:aws:iam::377460527677:role/CloudkeeperDelegationRole', 'eu-central-1')

    expect(tables).toBeTruthy()
    expect(tables.length).toBeGreaterThan(0)

    tables.forEach((table) => {
      expect(table).toEqual({
        name: expect.any(String),
        tenantId: expect.any(String),
        billingMode: expect.any(String),
        sizeBytes: expect.any(Number),
        items: expect.any(Number),
      })
    })
  })
})
