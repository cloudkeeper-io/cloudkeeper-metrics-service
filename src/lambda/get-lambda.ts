import { getConnection } from '../db/db'
import { LambdaConfiguration } from '../entity'

export const handler = async (request) => {
  const { name, region, tenantId } = request

  const connection = await getConnection()

  const repository = connection.getRepository(LambdaConfiguration)

  return repository.findOne({ tenantId, name, region })
}
