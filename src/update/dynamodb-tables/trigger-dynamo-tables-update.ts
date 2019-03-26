// eslint-disable-next-line import/no-extraneous-dependencies
import * as Lambda from 'aws-sdk/clients/lambda'
import { map } from 'lodash'
import { scanForArray } from '../../utils/dynamodb'

const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async () => {
  const tenants = await scanForArray({
    TableName: `${process.env.stage}-cloudkeeper-tenants`,
  })

  console.log(`Updating ${tenants.length} tenants`)

  await Promise.all(
    map(tenants, tenant => lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-dynamo-tables`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(tenant),
    }).promise()),
  )

  return true
}
