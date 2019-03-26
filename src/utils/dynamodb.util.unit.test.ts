/* eslint-disable import/no-extraneous-dependencies */
import * as AWS from 'aws-sdk'
import { listTables } from './dynamodb.util'

const credentials = AWS.config.credentials!

describe('dynamo data', () => {
  jest.setTimeout(30000)

  test('list tables - happy path', async () => {
    const tables = await listTables('test', credentials.accessKeyId, credentials.secretAccessKey, 'eu-central-1')

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
