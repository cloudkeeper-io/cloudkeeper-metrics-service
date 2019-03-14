// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk'
import { getMostErrorsLambdas, getMostInvokedLambdas, getSlowestLambdas, getTotals } from './data-collectors'

const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const handler = async (event) => {
  await Promise.all(event.Records.map(async (record) => {
    const tenantId = record.Sns.Message

    console.log(`Preparing data for ${tenantId}`)

    const totals = await getTotals(tenantId, 1)

    const slowestLambdas = await getSlowestLambdas(tenantId, 1)

    const mostInvokedLambdas = await getMostInvokedLambdas(tenantId, 1)

    const mostErrorsLambdas = await getMostErrorsLambdas(tenantId, 1)

    const last30DaysTotals = await getTotals(tenantId, 30, true)

    const last30DaysSlowestLambdas = await getSlowestLambdas(tenantId, 30, true)

    const last30DaysMostInvokedLambdas = await getMostInvokedLambdas(tenantId, 30, true)

    const last30DaysMostErrorsLambdas = await getMostErrorsLambdas(tenantId, 30, true)

    const data = {
      last24Hours: {
        totals,
        slowestLambdas,
        mostInvokedLambdas,
        mostErrorsLambdas,
      },
      last30Days: {
        totals: last30DaysTotals,
        slowestLambdas: last30DaysSlowestLambdas,
        mostInvokedLambdas: last30DaysMostInvokedLambdas,
        mostErrorsLambdas: last30DaysMostErrorsLambdas,
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
