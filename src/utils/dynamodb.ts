import { ScanInput } from 'aws-sdk/clients/dynamodb'
import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client'
import AttributeMap = DocumentClient.AttributeMap;

const dynamoDb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

export const scanForArray = async (params: ScanInput) => {
  const results: AttributeMap[] = []

  while (true) {
    const scanResults = await dynamoDb.scan(params).promise()

    if (!scanResults.Items) {
      return results
    }

    results.push(...scanResults.Items)

    if (typeof scanResults.LastEvaluatedKey === 'undefined') {
      return results
    }

    params.ExclusiveStartKey = scanResults.LastEvaluatedKey
  }
}
