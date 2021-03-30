import { assert } from 'chai'; // Using Assert style
import { expect } from 'chai'; // Using Expect style
import { should } from 'chai'; // Using Should style

import {
  getOsProductVersion,
  getProductDownloadInfo,
  getProductCsvDownloadInfo,
  maybeDownloadProduct,
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
    let actual;
    try {
      actual = await getOsProductVersion('Invalid');
    } catch (error) {
      expect(error).to.exists;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check get product download info', async () => {
    let actual;
    try {
      const apiVersion = await getOsProductVersion('OpenNames');
      actual = await getProductDownloadInfo('OpenNames', apiVersion);
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual.data).to.be.an('array');
      expect(actual.status).to.equal(200);
    }
  });

  it('check get product download info: invalid name', async () => {
    let actual;
    try {
      const apiVersion = await getOsProductVersion('OpenNames');
      actual = await getProductDownloadInfo('Invalid', apiVersion);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check get product download info: invalid version', async () => {
    let actual;
    try {
      actual = await getProductDownloadInfo('OpenNames', '1997-01');
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check get product download csv', async () => {
    const downloads = {
      data: [
        {
          md5: '95499136374EA485B44FD5AC607EA0C1',
          size: 105912517,
          url:
            'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=CSV&redirect',
          format: 'CSV',
          area: 'GB',
          fileName: 'opname_csv_gb.zip',
        },
        {
          md5: '7CB501D8CD2F131D1E3E06A9D40AAC1E',
          size: 216389614,
          url:
            'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=GML&subformat=3&redirect',
          format: 'GML',
          subformat: '3',
          area: 'GB',
          fileName: 'opname_gml3_gb.zip',
        },
        {
          md5: '5B2F240FD74C02B6F427230B45BA3A0B',
          size: 266609950,
          url:
            'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=GeoPackage&redirect',
          format: 'GeoPackage',
          area: 'GB',
          fileName: 'opname_gpkg_gb.zip',
        },
      ],
    };

    const expected = {
      md5: '95499136374EA485B44FD5AC607EA0C1',
      size: 105912517,
      url:
        'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=CSV&redirect',
      format: 'CSV',
      area: 'GB',
      fileName: 'opname_csv_gb.zip',
    };

    let actual;
    try {
      actual = await getProductCsvDownloadInfo(downloads);
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.deep.equal(expected);
    }
  });

  it('check get product download csv: invalid', async () => {
    const downloads = {
      data: [
        {
          md5: '95499136374EA485B44FD5AC607EA0C1',
          url:
            'https://api.os.uk/downloads/v1/products/OpenNames/downloads?area=GB&format=CSV&redirect',
          format: 'CSV',
        },
      ],
    };

    let actual;
    try {
      actual = await getProductCsvDownloadInfo(downloads);
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check maybeDownloadProduct: with ignore cached file', async () => {
    let actual;
    try {
      const apiVersion = await getOsProductVersion('OpenNames');
      actual = await maybeDownloadProduct('OpenNames', apiVersion, true);
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.be.a('string');
    }
  }).timeout(60000);

  it('check maybeDownloadProduct: with cached file', async () => {
    let actual;
    try {
      const apiVersion = await getOsProductVersion('OpenNames');
      actual = await maybeDownloadProduct('OpenNames', apiVersion);
    } catch (error) {
      expect(error).to.be.undefined;
    } finally {
      expect(actual).to.be.a('string');
    }
  }).timeout(20000);

  it('check maybeDownloadProduct: invalid version', async () => {
    let actual;
    try {
      actual = await maybeDownloadProduct('OpenNames', '1997-01');
    } catch (error) {
      expect(error).to.exist;
    } finally {
      expect(actual).to.be.undefined;
    }
  });
});
