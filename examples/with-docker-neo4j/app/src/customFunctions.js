/**
 * Custom constants
 */
const allowedTypes = ['populatedPlace', 'other'];
const allowedLocalTypes = ['Postcode', 'Hamlet'];

/**
 * Example of how to import data,
 * in addition to the packages defaults of
 * ['id', 'name', 'type', 'lat', 'lng']
 */
const customFunctions = {
  /**
   * Add to the dist (processed) csv file header
   */
  distCsvHeadersFilter: async ({ distCsvHeaders }) => {
    await distCsvHeaders.push('county');
    return { distCsvHeaders };
  },
  /**
   * Check if the row is valid.
   * By default only postcodes are valid.
   */
  rowIsValidFilter: async ({ rowIsValid, data }) => {
    return {
      rowIsValid:
        allowedTypes.includes(data['TYPE']) &&
        allowedLocalTypes.includes(data['LOCAL_TYPE']),
    };
  },
  /**
   * If county is on the row, then set it to the
   * processedRow object
   */
  processedRowFilter: async ({ processedRow, row }) => {
    processedRow.county = row.COUNTY_UNITARY !== '' ? row.COUNTY_UNITARY : null;

    return { processedRow };
  },
  /**
   * Add the the cypher import statement
   */
  placeImportStatementFilter: async ({ placeImportStatement }) => {
    const find = `// PLACE PROPERTIES`;
    const replace = `
    ${find} 
    p.county  = place.county,
    `;
    return {
      placeImportStatement: placeImportStatement.replace(find, replace),
    };
  },
  /**
   * Add your own debugger here.
   */
  // debug: (message) => {
  //   console.debug(message);
  // },
};

export { customFunctions };
