import { checkAccess } from '../utils/lambda.util'

export const handler = async (request) => {
  console.log(`Request: ${request}`)

  const { accessKey, secretKey, region, tenantId } = request

  try {
    const additionalInfo = await checkAccess(accessKey, secretKey, region)

    return {
      status: 'SUCCESS',
      ...additionalInfo,
    }
  } catch (err) {
    console.log(`error setting up access for tenant ${tenantId}`, err)
    return {
      status: 'FAILED',
    }
  }
}
