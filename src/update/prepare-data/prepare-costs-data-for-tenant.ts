// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { DateTime } from 'luxon'
import { getCostsPerService, getCostsPerStack } from './costs-data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    console.log(`Preparing data for tenant ${tenantId}`)

    const endDate = DateTime.utc().startOf('second').toISODate()

    const startDate = DateTime.utc().minus({ days: 30 }).startOf('second').toISODate()

    const costsPerService = await getCostsPerService(tenantId, startDate, endDate)

    const costsPerStack = await getCostsPerStack(tenantId, startDate, endDate)

    const data = {
      costsPerService,
      costsPerStack,
    }

    await s3.putObject({
      Bucket: process.env.bucket!,
      Key: `dashboard/data/costs/${tenantId}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }).promise()
  }))

  return true
}
