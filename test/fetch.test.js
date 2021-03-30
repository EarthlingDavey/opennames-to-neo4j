import { expect } from 'chai';
import fs from 'fs-extra';

import { defaultOptions } from '../src/utils/defaults.js';
import { getOsProductVersion } from '../src/models/Product.js';
import { fetchDataSources } from '../src/controllers/fetch.js';

describe('check fetchDataSources ', () => {
  it('check fetchDataSources', async () => {
    const options = {
      batchSize: 10,
      neo4jImportDir: '/tmp/import',
      waits: {
        process: 1,
        import: 1,
        clean: 1,
      },
      functions: {},
      includeFiles: ['TR04.csv'],
    };

    const apiVersion = await getOsProductVersion('OpenNames');
    const fetchedDataSources = await fetchDataSources(options, apiVersion);

    expect(fetchedDataSources.dataDir).to.be.a('string');
    expect(fetchedDataSources.filesArray).to.be.an('array');
    expect(fetchedDataSources.headers).to.be.an('array');
  }).timeout(60000);

  it('check fetchDataSources: invalid version', async () => {
    const apiVersion = '1997-01';
    let actual;
    try {
      actual = await fetchDataSources(defaultOptions, apiVersion);
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(actual).to.be.undefined;
    }
  }).timeout(60000);
});
