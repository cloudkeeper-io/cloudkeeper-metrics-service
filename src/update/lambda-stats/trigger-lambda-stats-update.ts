import * as Lambda from 'aws-sdk/clients/lambda'
import { map } from 'lodash'
import { scanForArray } from '../../utils/dynamodb'

const lambda = new Lambda({ apiVersion: '2015-03-31' })

export const handler = async () => {
  const tenants = await scanForArray({
    TableName: `${process.env.stage}-tenant-cloud-configuration`,
  })

  console.log(`Updating ${tenants.length} tenants`)

  await Promise.all(
    map(tenants, tenant => lambda.invoke({
      FunctionName: `cloudkeeper-metrics-service-${process.env.stage}-update-tenant-lambda-stats`,
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(tenant),
    }).promise()),
  )

  return true
}
