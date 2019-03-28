export const getDateCondition = (groupDaily, parameterString = '?') => {
  if (groupDaily) {
    return `(DATE(\`dateTime\`) >= DATE(UTC_TIMESTAMP()) - INTERVAL ${parameterString} DAY) `
  }
  return `(\`dateTime\` >= UTC_TIMESTAMP()  - INTERVAL ${parameterString} DAY - INTERVAL 1 HOUR) `
}
