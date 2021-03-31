import { expect } from 'chai'; // Using Expect style

import {
  maybeOpenConnection,
  maybeCloseConnection,
} from './test-connection.js';

import {
  processPlaces,
  processRow,
  importPlaces,
} from '../src/models/Place.js';

import { getFileContents } from '../src/utils/files.js';

import { waitSeconds } from '../src/utils/utils.js';

import { headers202101 as testCsvHeaders } from './constants.js';

describe.only('check place ', () => {
  let driver, session;

  before(async function () {
    const c = await maybeOpenConnection(driver, session);
    driver = c.driver;
    session = c.session;
  });

  after(async function () {
    maybeCloseConnection(driver, session);
  });

  it('check processRow', async () => {
    let actual;
    const row = {
      ID: 'PO211LE',
      NAMES_URI: 'http://data.ordnancesurvey.co.uk/id/postcodeunit/PO211LE',
      NAME1: 'PO21 1LE',
      NAME1_LANG: '',
      NAME2: '',
      NAME2_LANG: '',
      TYPE: 'other',
      LOCAL_TYPE: 'Postcode',
      GEOMETRY_X: '493786',
      GEOMETRY_Y: '99056',
    };
    const expected = {
      id: 'PO211LE',
      name: 'PO21 1LE',
      type: 'Postcode',
      lat: 50.783503791605796,
      lng: -0.6710016168441663,
    };

    try {
      actual = await processRow(row);
    } catch (error) {
      expect(error).to.be.undefined;
    }

    expect(actual).to.deep.equal(expected);
  });

  it('check processRow: invalid geometry', async () => {
    let actual;
    const row = {
      ID: 'PO211LE',
      NAME1: 'PO21 1LE',
      LOCAL_TYPE: 'Postcode',
      GEOMETRY_X: '9999999999',
      GEOMETRY_Y: '99056',
    };

    try {
      actual = await processRow(row);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check processPlaces', async () => {
    let actualDataSource;
    const dataSource = {
      processed: null,
      fileName: 'TR00.csv',
      importFileUrl: null,
      validRows: 3993,
      imported: null,
      filePath: './test/assets/source-TR00.csv',
      cleaned: null,
      id: '2021-01/TR00.csv',
      version: '2021-01',
      importFilePath: null,
    };

    const options = {
      batchSize: 1,
      neo4jImportDir: './tmp/for-test/process-places',
      functions: {},
      includeFiles: ['TR00.csv'],
    };

    const expectedDataSource = {
      processed: true,
      fileName: 'TR00.csv',
      importFileUrl: null,
      validRows: 19,
      imported: null,
      filePath: './test/assets/source-TR00.csv',
      cleaned: null,
      id: '2021-01/TR00.csv',
      version: '2021-01',
      importFilePath:
        '/home/node/app/tmp/for-test/process-places/os/OpenNames/2021-01/TR00.csv',
    };

    try {
      actualDataSource = await processPlaces(
        dataSource,
        testCsvHeaders,
        options
      );
      await waitSeconds(0.5);
    } catch (error) {
      expect(error).to.be.undefined;
    }

    expect(actualDataSource).to.deep.equal(expectedDataSource);

    let actualContents, expectedContents;

    /**
     * Read the processed file and compare to the expected file
     */
    try {
      actualContents = await getFileContents(actualDataSource.importFilePath);
      expectedContents = await getFileContents(
        './test/assets/expected-TR00.csv'
      );
    } catch (error) {
      expect(error).to.be.undefined;
    }
    expect(actualContents).to.exist;
    expect(actualContents).to.equal(expectedContents);
  });

  it('check processPlaces: invalid headers', async () => {
    let actualDataSource;
    const dataSource = {
      processed: null,
      fileName: 'TR00.csv',
      importFileUrl: null,
      validRows: 3993,
      imported: null,
      filePath: './test/assets/source-TR00.csv',
      cleaned: null,
      id: '2021-01/TR00.csv',
      version: '2021-01',
      importFilePath: null,
    };

    const headers = ['ID', 'NAMES_URI'];

    const options = {
      batchSize: 1,
      neo4jImportDir: './tmp/for-test/process-places/invalid-headers',
      functions: {},
      includeFiles: ['TR00.csv'],
    };

    try {
      actualDataSource = await processPlaces(dataSource, headers, options);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actualDataSource).to.be.undefined;
    }
  });

  it('check processPlaces: invalid filePath', async () => {
    let actualDataSource;
    const dataSource = {
      processed: null,
      fileName: 'TR00.csv',
      importFileUrl: null,
      validRows: 3993,
      imported: null,
      filePath: './test/assets/does-not-exist.csv',
      cleaned: null,
      id: '2021-01/TR00.csv',
      version: '2021-01',
      importFilePath: null,
    };

    const options = {
      batchSize: 1,
      neo4jImportDir: './tmp/for-test/process-places/invalid-file-path',
      functions: {},
      includeFiles: ['TR00.csv'],
    };

    try {
      actualDataSource = await processPlaces(
        dataSource,
        testCsvHeaders,
        options
      );
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actualDataSource).to.be.undefined;
    }
  });

  // it('check importPlaces: no session', async () => {
  //   let actual;

  //   try {
  //     actual = await importPlaces(
  //       undefined,
  //       dataSource,
  //       options
  //     );
  //   } catch (error) {
  //     // console.log(error);
  //     expect(error).to.exist;
  //   } finally {
  //     expect(actual).to.be.undefined;
  //   }
  // });
});
