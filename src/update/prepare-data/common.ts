export const getDateCondition = (groupDaily) => {
  if (groupDaily) {
    return '(DATE(`dateTime`) > DATE(UTC_TIMESTAMP()) - INTERVAL ? DAY) '
  }
  return '(`dateTime` >= UTC_TIMESTAMP()  - INTERVAL ? DAY - INTERVAL 1 HOUR) '
}
