import { expect } from 'chai';
import neo4j from 'neo4j-driver';

import {
  getNeo4jSession,
  mergeByProperty,
  mergeDeep,
  waitSeconds,
} from '../src/utils/utils.js';

describe('check utility functions ', () => {
  it('check getNeo4jSession: session', () => {
    const session = {
      dummy: 'object',
    };
    const actual = getNeo4jSession({ session });
    const expected = { session: session, shouldCloseSession: false };

    expect(actual).to.deep.equal(expected);
  });

  it('check getNeo4jSession: driver', () => {
    const driver = {
      dummy: 'object',
      session: () => {
        return 'test';
      },
    };
    const actual = getNeo4jSession({ driver });
    const expected = { session: 'test', shouldCloseSession: true };

    expect(actual).to.deep.equal(expected);
  });

  it('check getNeo4jSession: strings', () => {
    const strings = {
      uri: 'bolt://neo4j:7687',
      user: 'neo4j',
      password: 'pass',
    };
    const actual = getNeo4jSession({ strings });

    const driver = neo4j.driver(
      strings.uri,
      neo4j.auth.basic(strings.user, strings.password)
    );
    const expected = { session: driver.session(), shouldCloseSession: true };

    expect(actual.session).to.have.keys(Object.keys(expected.session));
    expect(actual.shouldCloseSession).to.equal(expected.shouldCloseSession);

    actual.session.close();
    expected.session.close();
  });

  it('check mergeByProperty', () => {
    let dataSources = [
      {
        id: '2021-01/TV68.csv',
        processed: null,
        imported: null,
        cleaned: null,
        filePath: '/tmp/os/OpenNames/2021-01/DATA/TV68.csv',
      },
    ];
    const processedDataSources = [
      {
        id: '2021-01/TV68.csv',
        processed: true,
        importFilePath: '/tmp/import/os/OpenNames/2021-01/TV68.csv',
        validRows: 845,
      },
    ];

    mergeByProperty(dataSources, processedDataSources, 'id');

    const expected = [
      {
        id: '2021-01/TV68.csv',
        processed: true,
        imported: null,
        cleaned: null,
        filePath: '/tmp/os/OpenNames/2021-01/DATA/TV68.csv',
        importFilePath: '/tmp/import/os/OpenNames/2021-01/TV68.csv',
        validRows: 845,
      },
    ];

    expect(dataSources).to.deep.equal(expected);
  });

  it('check mergeDeep', () => {
    const defaultOptions = {
      batchSize: 10,
      neo4jImportDir: '/tmp/import',
      waits: {
        process: 1,
        import: 1,
        clean: 1,
      },
      functions: {},
    };
    const customFunctions = {
      distCsvHeadersFilter: async ({ distCsvHeaders }) => {
        await distCsvHeaders.push('county');
        return { distCsvHeaders };
      },
    };
    let options = {
      includeFiles: ['TR04.csv'],
      functions: customFunctions,
      neo4jImportDir: '/app/public',
      neo4jImportUrl: 'http://app:3000/public',
      waits: {
        import: 10,
      },
    };
    const expected = {
      batchSize: 10,
      includeFiles: ['TR04.csv'],
      functions: customFunctions,
      neo4jImportDir: '/app/public',
      neo4jImportUrl: 'http://app:3000/public',
      waits: {
        process: 1,
        import: 10,
        clean: 1,
      },
    };

    options = mergeDeep(defaultOptions, options);

    expect(options).to.deep.equal(expected);
  });

  it('check wait', async () => {
    const start = new Date().getTime();
    await waitSeconds(1);
    const duration = new Date().getTime() - start;

    expect(duration).to.within(900, 1100);
  });
});
