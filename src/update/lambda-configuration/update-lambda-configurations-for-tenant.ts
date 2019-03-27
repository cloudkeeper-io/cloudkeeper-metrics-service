import * as Lambda from 'aws-sdk/clients/lambda'

import { flatMap } from 'lodash'
import { getConnection } from '../../db/db'
import { listAllLambdas } from '../../utils/lambda.util'
import { LambdaConfiguration } from '../../entity'

const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  const connection = await getConnection()

  console.log('Connected to db')

  const lambdas = await listAllLambdas(tenant.id, tenant.accessKey, tenant.secretKey, tenant.region)

  console.log(`Tenant has ${lambdas.length} lambdas`)

  const query = connection.createQueryBuilder()
    .insert()
    .into(LambdaConfiguration)
    .values(lambdas)
    .getQuery()
    .replace('INSERT INTO', 'REPLACE INTO')

  const params = flatMap(lambdas, lambda => [
    lambda.tenantId,
    lambda.name,
    lambda.runtime,
    lambda.codeSize,
    lambda.timeout,
    lambda.size,
  ])

  await connection.query(query, params)

  console.log('Finished updating lambdas')

  if (tenant.triggerStatsUpdate) {
    await lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-lambda-stats`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(tenant),
    }).promise()
  }
}
