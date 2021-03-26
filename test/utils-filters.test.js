import { expect } from 'chai';

import { filters } from '../src/utils/filters.js';
import { distCsvHeaders } from '../src/utils/defaults.js';

import { importStatement } from '../src/models/Place.js';

describe('check util/filter functions ', () => {
  const options = {
    functions: {
      distCsvHeadersFilter: async ({ distCsvHeaders }) => {
        await distCsvHeaders.push('county');
        return { distCsvHeaders };
      },
      rowIsValidFilter: async ({ rowIsValid, data }) => {
        return {
          rowIsValid: ['City', 'Postcode'].includes(data['LOCAL_TYPE']),
        };
      },
      processedRowFilter: async ({ processedRow, row }) => {
        processedRow.county =
          row.COUNTY_UNITARY !== '' ? row.COUNTY_UNITARY : null;

        return { processedRow };
      },
      placeImportStatementFilter: async ({ placeImportStatement }) => {
        const find = `// PLACE PROPERTIES`;
        const replace = `${find} 
        p.county = place.county,`;
        return {
          placeImportStatement: placeImportStatement.replace(find, replace),
        };
      },
    },
  };

  it('check filter: distCsvHeadersFilter', async () => {
    const actual = await filters(
      { distCsvHeaders: [...distCsvHeaders] },
      'distCsvHeaders',
      options
    );
    const expected = ['id', 'name', 'type', 'lat', 'lng', 'county'];

    expect(actual).to.deep.equal(expected);
  });

  it('check filter: rowIsValidFilter', async () => {
    const rowIsValid = true,
      data = { LOCAL_TYPE: 'City' };
    const actual = await filters({ rowIsValid, data }, 'rowIsValid', options);

    expect(actual).to.be.true;
  });

  it('check filter: rowIsValidFilter invalid', async () => {
    const rowIsValid = true,
      data = { LOCAL_TYPE: 'invalid' };
    const actual = await filters({ rowIsValid, data }, 'rowIsValid', options);

    expect(actual).to.be.false;
  });

  it('check filter: processedRowFilter', async () => {
    // This would be the whole row of data from the csv.
    // Using only part of it for the tests.
    const row = {
      SOME: '',
      STUFF: 0.5,
      COUNTY_UNITARY: 'Bedfordshire',
    };
    const processedRow = {
      id: 'AB12 3CD',
      lat: 0.5,
      lng: 50,
      name: 'AB12 3CD',
      type: 'Postcode',
    };
    const expected = {
      ...processedRow,
      county: 'Bedfordshire',
    };
    const actual = await filters(
      { processedRow, row },
      'processedRow',
      options
    );

    expect(actual).to.deep.equal(expected);
  });

  it('check filter: placeImportStatementFilter', async () => {
    const actual = await filters(
      { placeImportStatement: importStatement },
      'placeImportStatement',
      options
    );
    // Compare with line breaks removed.
    const stripped = actual.replace(/(\r\n|\n|\r)/gm, '');
    // And all multi spaces to single.
    const normalSpaces = stripped.replace(/(\s+)/gm, ' ');

    expect(normalSpaces).to.have.string(
      'SET // PLACE PROPERTIES p.county = place.county, p.name = place.name,'
    );
  });
});
