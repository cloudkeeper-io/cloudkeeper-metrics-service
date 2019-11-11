import * as Lambda from 'aws-sdk/clients/lambda'

import { flatMap } from 'lodash'
import { getConnection } from '../../db/db'
import { listAllLambdas } from '../../utils/lambda-metrics.util'
import { LambdaConfiguration } from '../../entity'
import { getAwsRegions } from '../../utils/aws.utils'

const lambdaService = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.id}`)
  const connection = await getConnection()

  console.log('Connected to db')

  const regions = await getAwsRegions()

  for (const region of regions) {
    try {
      const lambdas = await listAllLambdas(tenant.id, tenant.roleArn, region)

      console.log(`Tenant has ${lambdas.length} lambdas in ${region}`)

      const query = connection.createQueryBuilder()
        .insert()
        .into(LambdaConfiguration)
        .values(lambdas)
        .getQuery()
        .replace('INSERT INTO', 'REPLACE INTO')

      const params = flatMap(lambdas, lambda => [
        lambda.tenantId,
        lambda.name,
        lambda.region,
        lambda.runtime,
        lambda.codeSize,
        lambda.timeout,
        lambda.size,
      ])


      await connection.query(query, params)
    } catch (err) {
      console.log(`Error updating region: ${region}`, err)
    }
  }

  console.log('Finished updating lambdas')

  await lambdaService.invoke({
    FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-lambda-stats`,
    InvocationType: 'Event',
    LogType: 'None',
    Payload: JSON.stringify(tenant),
  }).promise()
}
