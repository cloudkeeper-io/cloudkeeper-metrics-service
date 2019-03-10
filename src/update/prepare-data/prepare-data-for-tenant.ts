// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { getSlowestLambdas, getTotals } from './data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    console.log(`Preparing data for ${tenantId}`)

    const totals = await getTotals(tenantId, 1)

    const slowestLambdas = await getSlowestLambdas(tenantId, 1)

    const data = {
      last24Hours: {
        totals,
        slowestLambdas,
      },
    }

    await s3.putObject({
      Bucket: process.env.bucket!,
      Key: `dashboard/data/${tenantId}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }).promise()
  }))

  return true
}
