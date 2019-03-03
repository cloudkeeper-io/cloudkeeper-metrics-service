import * as AWS from 'aws-sdk'
import { getTotals } from './data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    const totals = await getTotals(tenantId)

    await s3.putObject({
      Bucket: process.env.bucket!,
      Key: `dashboard/data/${tenantId}.json`,
      Body: JSON.stringify(totals),
      ContentType: 'application/json',
    }).promise()
  }))

  return true
}
