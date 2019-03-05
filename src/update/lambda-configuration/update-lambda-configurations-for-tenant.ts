import { flatMap } from 'lodash'
import { getConnection } from '../../db/db'
import { listAllLambdas } from '../../utils/lambda.util'
import { LambdaConfiguration } from '../../entity'

export const handler = async (tenant) => {
  console.log(`Working on tenant ${tenant.tenantId}`)
  const connection = await getConnection()

  console.log('Connected to db')

  const lambdas = await listAllLambdas(tenant.tenantId, tenant.accessKey, tenant.secretKey, tenant.region)

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
}
