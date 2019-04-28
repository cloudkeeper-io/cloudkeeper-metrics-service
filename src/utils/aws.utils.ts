import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
// @ts-ignore
import * as AWSXRay from 'aws-xray-sdk-core'
import { memoize, map } from 'lodash'

const getAws = memoize(() => {
  if (AWSXRay.getNamespace().get('segment')) {
    return AWSXRay.captureAWS(AWS)
  }

  return AWS
})

export const getDynamo = memoize((): DocumentClient => {
  const aws = getAws()
  return new aws.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
})

export const getAwsCredentials = async (tenantId, roleArn) => {
  const sts = new AWS.STS()
  const params = {
    RoleArn: roleArn,
    RoleSessionName: 'CrossAccountCredentials',
    ExternalId: tenantId,
    DurationSeconds: 3600,
  }

  const assumeRoleResponse = await sts.assumeRole(params).promise()

  return {
    accessKeyId: assumeRoleResponse.Credentials!.AccessKeyId,
    secretAccessKey: assumeRoleResponse.Credentials!.SecretAccessKey,
    sessionToken: assumeRoleResponse.Credentials!.SessionToken,
  }
}

export const getAwsRegions = async () => {
  const ec2 = new AWS.EC2()
  return map((await ec2.describeRegions().promise()).Regions, 'RegionName')
}
