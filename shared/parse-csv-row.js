module.exports = function (row, idx, importLog) {
  const foodRating = constructFootRatingRecord(row)
  importLog.totalRows++
  importLog.rows.push(foodRating)
}

function constructFootRatingRecord (source) {
  const mapping = [
    ['fhrsId', '﻿FHRSID'],
    ['localAuthorityBusinessId', 'LocalAuthorityBusinessID'],
    ['businessName', 'BusinessName'],
    ['businessType', 'BusinessType'],
    ['businessTypeId', 'BusinessTypeID'],
    ['addressLine1', 'AddressLine1'],
    ['addressLine2', 'AddressLine2'],
    ['addressLine3', 'AddressLine3'],
    ['addressLine4', 'AddressLine4'],
    ['postcode', 'PostCode'],
    ['ratingValue', 'RatingValue'],
    ['ratingKey', 'RatingKey'],
    ['ratingDate', 'RatingDate.Element\',Text\''],
    ['localAuthorityCode', 'LocalAuthorityCode'],
    ['localAuthorityName', 'LocalAuthorityName'],
    ['localAuthorityWebSite', 'LocalAuthorityWebSite'],
    ['localAuthorityEmailAddress', 'LocalAuthorityEmailAddress'],
    ['hygiene', 'Scores.Hygiene'],
    ['structural', 'Scores.Structural'],
    ['confidenceInManagement', 'Scores.ConfidenceInManagement'],
    ['schemeType', 'SchemeType'],
    ['newRatingPending', 'NewRatingPending'],
    ['longitude', 'Geocode.Longitude'],
    ['latitude', 'Geocode.Latitude'],
    ['rightToReply', 'RightToReply'],
    ['uprn', 'UPRN']
  ]
  const target = {}
  for (const [targetKey, sourceKey] of mapping) {
    const value = source[sourceKey]
    if (typeof value === 'string' && value.trim().length === 0) {
      continue
    }
    if (value === null || value === undefined) {
      continue
    }
    target[targetKey] = source[sourceKey]
  }
  return target
}
