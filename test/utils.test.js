import { expect } from 'chai';
import neo4j from 'neo4j-driver';
import Integer from 'neo4j-driver/lib/integer.js';

import {
  getNeo4jSession,
  toNeo4jInteger,
  mergeByProperty,
  mergeDeep,
  waitSeconds,
  styledMessage,
  styledDebug,
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

  it('check getNeo4jSession: invalid', () => {
    let actual;

    try {
      actual = getNeo4jSession({ invalid: 'invalid' });
    } catch (error) {
      expect(error).to.equal(
        'You must define session, driver or, connection strings'
      );
    } finally {
    }
  });

  it('check toNeo4jInteger', () => {
    let actual;
    try {
      const input = Integer.default.fromString('100000000');
      actual = toNeo4jInteger(input);
    } catch (error) {
      console.log(error);
    }
    expect(actual).to.deep.equal(100000000);
  });

  it('check toNeo4jInteger: unsafe js integer', () => {
    let actual, input, string;
    try {
      input = Integer.default.fromValue('1000000000000000000');
    } catch (error) {
      expect(error).to.be.undefined;
    }
    try {
      actual = toNeo4jInteger(input);
    } catch (error) {
      expect(error).to.be.undefined;
    }

    expect(actual).to.equal('1000000000000000000');
  });

  it('check toNeo4jInteger: invalid', () => {
    const input = { invalid: 'invalid' };
    const actual = toNeo4jInteger(input);
    expect(actual).to.deep.equal(input);
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
      {
        id: '2021-01/TV69.csv',
        processed: null,
      },
    ];
    const processedDataSources = [
      {
        id: '2021-01/TV68.csv',
        processed: true,
        importFilePath: '/tmp/import/os/OpenNames/2021-01/TV68.csv',
        validRows: 845,
      },
      {
        id: '2021-01/TV70.csv',
        processed: true,
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
      {
        id: '2021-01/TV69.csv',
        processed: null,
      },
      {
        id: '2021-01/TV70.csv',
        processed: true,
      },
    ];

    expect(dataSources).to.deep.equal(expected);
  });

  it('check mergeDeep: objects', () => {
    const options1 = {
      batchSize: 10,
      includeFiles: ['TR04.csv'],
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
    const options2 = {
      includeFiles: ['TR04.csv', 'TR05.csv'],
      functions: customFunctions,
      neo4jImportDir: '/app/public',
      neo4jImportUrl: 'http://app:3000/public',
      waits: {
        import: 10,
      },
    };
    const expected = {
      batchSize: 10,
      includeFiles: ['TR04.csv', 'TR05.csv'],
      functions: customFunctions,
      neo4jImportDir: '/app/public',
      neo4jImportUrl: 'http://app:3000/public',
      waits: {
        process: 1,
        import: 10,
        clean: 1,
      },
    };

    const options3 = mergeDeep(options1, options2);

    expect(options3).to.deep.equal(expected);
  });

  it('check wait', async () => {
    const start = new Date().getTime();
    await waitSeconds(1);
    const duration = new Date().getTime() - start;

    expect(duration).to.within(900, 1100);
  });

  it('check styledMessage', async () => {
    if (global.on2n4j?.debug?.inset) {
      global.on2n4j.debug.inset = 0;
    }

    const original1 = '>>>>>> Start someFunction';
    const { prefix: prefix1, message: message1 } = styledMessage(original1);
    expect(message1).to.equal(original1);
    expect(prefix1).to.exist;

    const original2 = 'test message';
    const { prefix: prefix2, message: message2 } = styledMessage(original2);
    expect(message2).to.equal('  ' + original2);
    expect(prefix2).to.equal('');

    const original3 = 'some value: 10';
    const { prefix: prefix3, message: message3 } = styledMessage(original3);
    expect(message3).to.equal('  ' + 'some value:                         10');
    expect(prefix3).to.exist;

    const originalEnd = '<<<<<< End someFunction';
    const { prefix: prefixEnd, message: messageEnd } = styledMessage(
      originalEnd
    );
    expect(messageEnd).to.equal(originalEnd);
    expect(prefixEnd).to.exist;
  });

  it('check styledMessage: not a string', async () => {
    const { prefix, message } = styledMessage({ invalid: 'invalid' });
    expect(message).to.deep.equal({ invalid: 'invalid' });
    expect(prefix).to.be.undefined;
  });

  it('check styledDebug', async () => {
    const actual = styledDebug("      logged for 'check styledDebug': 😎");
    expect(actual).to.be.undefined;
  });

  it('check styledDebug: plain string', async () => {
    const actual = styledDebug(
      "      logged for 'check styledDebug plain string'"
    );
    expect(actual).to.be.undefined;
  });
});
