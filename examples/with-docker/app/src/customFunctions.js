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
    distCsvHeaders.push('county');
    return { distCsvHeaders };
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
};

export { customFunctions };
