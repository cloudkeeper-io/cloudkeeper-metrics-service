// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import {
  getTotals,
} from './lambda-data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    console.log(`Preparing data for ${tenantId}`)

    const totals = await getTotals(tenantId, 1)
    const last30DaysTotals = await getTotals(tenantId, 30, true)

    const data = {
      last24Hours: {
        totals,
      },
      last30Days: {
        totals: last30DaysTotals,
      },
    }

    await s3.putObject({
      Bucket: process.env.bucket!,
      Key: `dashboard/data/lambda/${tenantId}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }).promise()
  }))

  return true
}
