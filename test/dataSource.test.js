import { expect } from 'chai';

import { headers202101 as testCsvHeaders } from './constants.js';
import {
  maybeOpenConnection,
  maybeCloseConnection,
} from './test-connection.js';

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
  deleteDataSource,
} from '../src/models/DataSource.js';

describe('check dataSource ', () => {
  let driver, session;

  before(async function () {
    const c = await maybeOpenConnection(driver, session);
    driver = c.driver;
    session = c.session;
  });

  after(async function () {
    maybeCloseConnection(driver, session);
  });

  it('check readDataSourceHeaders', async () => {
    let actual;

    try {
      actual = await readDataSourceHeaders('./test/assets');
    } catch (error) {
      expect(error).to.be.undefined;
    }
    expect(actual).to.deep.equals(testCsvHeaders);
  });

  it('check readDataSourceHeaders: invalid path', async () => {
    let actual;

    try {
      actual = await readDataSourceHeaders('./test/assets/does-not-exist');
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check getDbDataSources', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await getDbDataSources(session, '2021-01', {
        batchSize: 1,
        includeFiles: ['TR00.csv'],
      });
      // console.log(actual);
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      // TODO: make more specific.
      expect(actual).to.exist;
    }
  }).timeout(60000);

  it('check getDbDataSources: missing parameter(s)', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await getDbDataSources(session, undefined);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(10000);

  it('check getDbDataSources: missing session', async () => {
    let actual;

    try {
      actual = await getDbDataSources(undefined, '2021-01', {});
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(10000);

  it('check deleteDataSource: unknown if exists', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await deleteDataSource(session, '2021-01/TR04.csv');
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.be.oneOf([0, 1]);
    }
  }).timeout(10000);

  it('check deleteDataSource: node does not exist', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await deleteDataSource(session, '2021-01/TR04.csv');
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.equal(0);
    }
  }).timeout(10000);

  it('check dbSaveDataSources', async () => {
    if (!session) return;
    let actual;

    const expectedDataSources = [
      {
        processed: null,
        fileName: 'TR04.csv',
        importFileUrl: null,
        validRows: null,
        imported: null,
        filePath: '/tmp/os/OpenNames/2021-01/DATA/TR04.csv',
        cleaned: null,
        id: '2021-01/TR04.csv',
        version: '2021-01',
        importFilePath: null,
      },
    ];

    try {
      actual = await dbSaveDataSources(session, {
        version: '2021-01',
        dataDir: '/tmp/os/OpenNames/2021-01/DATA',
        filesArray: ['TR04.csv'],
        headers: testCsvHeaders,
      });
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual.dataSources).to.deep.equal(expectedDataSources);
      expect(actual.headers).to.deep.equal(testCsvHeaders);
    }
  }).timeout(20000);

  it('check dbSaveDataSources: with batchSize', async () => {
    if (!session) return;
    let actual;

    const expectedDataSources = [
      {
        processed: null,
        fileName: 'TR04.csv',
        importFileUrl: null,
        validRows: null,
        imported: null,
        filePath: '/tmp/os/OpenNames/2021-01/DATA/TR04.csv',
        cleaned: null,
        id: '2021-01/TR04.csv',
        version: '2021-01',
        importFilePath: null,
      },
      {
        processed: null,
        fileName: 'TR05.csv',
        importFileUrl: null,
        validRows: null,
        imported: null,
        filePath: '/tmp/os/OpenNames/2021-01/DATA/TR05.csv',
        cleaned: null,
        id: '2021-01/TR05.csv',
        version: '2021-01',
        importFilePath: null,
      },
    ];

    try {
      await deleteDataSource(session, '2021-01/TR04.csv');
      await deleteDataSource(session, '2021-01/TR05.csv');

      actual = await dbSaveDataSources(session, {
        options: { batchSize: 2 },
        version: '2021-01',
        dataDir: '/tmp/os/OpenNames/2021-01/DATA',
        filesArray: ['TR04.csv', 'TR05.csv', 'TR06.csv'],
        headers: testCsvHeaders,
      });
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual.dataSources).to.deep.equal(expectedDataSources);
      expect(actual.headers).to.deep.equal(testCsvHeaders);
    }
  }).timeout(20000);

  it('check dbSaveDataSources: missing parameter(s)', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await dbSaveDataSources(session, {
        filesArray: ['TR04.csv'],
        headers: testCsvHeaders,
      });
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check dbSaveDataSources: no session', async () => {
    let actual;

    try {
      actual = await dbSaveDataSources(null, {
        version: '2021-01',
        dataDir: '/tmp/os/OpenNames/2021-01/DATA',
        filesArray: ['TR04.csv'],
        headers: testCsvHeaders,
      });
    } catch (error) {
      // console.log(error);
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(60000);

  it('check updateDataSource', async () => {
    // console.log(1);
    if (!session) return;
    let actual;

    const newProperties = {
      processed: Math.random() < 0.5,
      imported: Math.random() < 0.5,
      cleaned: Math.random() < 0.5,
      validRows: (Date.now() + '').substr(-6),
    };
    // const newProperties = {
    //   processed: true,
    // };

    try {
      actual = await updateDataSource(session, {
        id: '2021-01/TR04.csv',
        ...newProperties,
      });
    } catch (error) {
      expect(error).to.be.undefined;
    }

    expect(actual.processed).to.equal(newProperties.processed);
    expect(actual.imported).to.equal(newProperties.imported);
    expect(actual.cleaned).to.equal(newProperties.cleaned);
    expect(actual.validRows).to.equal(newProperties.validRows);
  }).timeout(60000);

  it('check updateDataSource: undefined id', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await updateDataSource(session, {
        processed: false,
      });
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(20000);

  it('check updateDataSource: undefined properties', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await updateDataSource(session, {
        id: '2021-01/TR04.csv',
      });
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(20000);

  it('check updateDataSource: invalid id', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await updateDataSource(session, {
        id: 'invalid-id',
        processed: false,
      });
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(20000);

  it('check deleteDataSource: no session', async () => {
    let actual;

    try {
      actual = await deleteDataSource(undefined, '2021-01/TR04.csv');
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check deleteDataSource: no id', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await deleteDataSource(session);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check deleteDataSource: node does exist', async () => {
    if (!session) return;
    let actual;

    try {
      actual = await deleteDataSource(session, '2021-01/TR04.csv');
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.equal(1);
    }
  }).timeout(10000);
});
