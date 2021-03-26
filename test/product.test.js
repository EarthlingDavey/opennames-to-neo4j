import { assert } from 'chai'; // Using Assert style
import { expect } from 'chai'; // Using Expect style
import { should } from 'chai'; // Using Should style

import {
  getOsProductVersion,
  getProductDownloadInfo,
} from '../src/models/Product.js';

describe('check product ', () => {
  it('check get product version', async () => {
    let actual;
    try {
      actual = await getOsProductVersion('OpenNames');
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.match(/^\d{4}-\d{2}$/);
    }
  });

  it('check get product version: invalid name', async () => {
    let e;
    try {
      await getOsProductVersion('OpenName');
    } catch (error) {
      e = error;
    } finally {
      expect(e).to.equal(404);
    }
  });

  it('check get product download info', async () => {
    let actual;
    try {
      actual = await getProductDownloadInfo('OpenNames');
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual.md5).to.have.lengthOf(32);
      expect(actual.size).to.match(/^\d+$/);
      expect(actual.format).to.equal('CSV');
      expect(actual.area).to.equal('GB');
      expect(actual.fileName).to.equal('opname_csv_gb.zip');
      expect(actual.url).to.match(/^https:\/\/api\.os\.uk/);
    }
  });
});
