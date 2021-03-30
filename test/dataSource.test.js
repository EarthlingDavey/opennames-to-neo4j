import log from 'why-is-node-running';

import { expect } from 'chai';
import dotenv from 'dotenv';
import path from 'path';
import neo4j from 'neo4j-driver';
import async_hooks from 'async_hooks';

import { headers202101 as testCsvHeaders } from './constants.js';

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
} from '../src/models/DataSource.js';

describe('check dataSource ', () => {
  let driver, session;

  before(async function () {
    const result = dotenv.config({
      path: path.resolve('./test', '.env'),
    });
    if (result.error) {
      throw result.error;
    }
    try {
      const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = result.parsed;
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
      );
      session = driver.session();
      // console.log('starting session');
    } catch (error) {
      session = undefined;
      console.log(error);
    }
  });

  after(async function () {
    if (session) {
      await session.close();
    }
    if (driver) {
      await driver.close();
    }
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

  // it('check dbSaveDataSources', async () => {
  //   if (!session) return;
  //   let actual;

  //   const expectedDataSources = [
  //     {
  //       processed: null,
  //       fileName: 'TR04.csv',
  //       importFileUrl: null,
  //       validRows: null,
  //       imported: null,
  //       filePath: '/tmp/os/OpenNames/2021-01/DATA/TR04.csv',
  //       cleaned: null,
  //       id: '2021-01/TR04.csv',
  //       version: '2021-01',
  //       importFilePath: null,
  //     },
  //   ];

  //   try {
  //     actual = await dbSaveDataSources(session, {
  //       version: '2021-01',
  //       dataDir: '/tmp/os/OpenNames/2021-01/DATA',
  //       filesArray: ['TR04.csv'],
  //       headers: testCsvHeaders,
  //     });
  //   } catch (error) {
  //     expect(error).to.be.undefined;
  //   } finally {
  //     expect(actual.dataSources).to.deep.equal(expectedDataSources);
  //     expect(actual.headers).to.deep.equal(testCsvHeaders);
  //   }
  // }).timeout(60000);

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
});
