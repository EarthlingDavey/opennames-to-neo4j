import { expect } from 'chai'; // Using Expect style

import { headers202101 as testCsvHeaders } from './constants.js';
import { readDataSourceHeaders } from '../src/models/DataSource.js';

describe('check dataSource ', () => {
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
});
