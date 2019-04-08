/* eslint-disable import/no-extraneous-dependencies */
import * as AWS from 'aws-sdk'

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
