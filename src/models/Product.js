import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import md5File from 'md5-file';

import { downloadFile } from '../utils/files.js';

/**
 * Some conditionals can only be triggered if the API fails,
 * or the shape of the API response has been changed.
 * So, ignore them in the unit tests.
 */

/* not used for now */
/* c8 ignore start */
async function getOsProductList() {
  const productList = await axios(
    'https://api.os.uk/downloads/v1/products'
  ).catch((err) => {
    // what now?
    console.log(err);
  });
  return productList;
}
/* c8 ignore stop */

async function getOsProduct(id) {
  let product;
  try {
    product = await axios(`https://api.os.uk/downloads/v1/products/${id}`);
  } catch (error) {
    throw error;
  }

  /* c8 ignore next 3 */
  if (!product?.data.version) {
    throw 'getOsProduct no version data';
  }
  return product;
}

async function getOsProductVersion(id) {
  try {
    const product = await getOsProduct(id);
    return product.data.version;
  } catch (e) {
    throw e;
  }
}

const getProductDownloadInfo = async (id, version) => {
  const product = await getOsProduct(id);

  if (!product?.data?.version || product?.data?.version !== version) {
    throw `version not found: ${version}`;
  }

  /* c8 ignore next 3 */
  if (!product?.data.downloadsUrl) {
    throw `no downloadsUrl: ${version}`;
  }

  let downloads;
  try {
    downloads = await axios(product.data.downloadsUrl);
    /* c8 ignore next 3 */
  } catch (error) {
    throw ('no download data', error);
  }

  return downloads;
};

const getProductCsvDownloadInfo = async (downloads) => {
  const csvDownload = downloads.data.find(({ format }) => 'CSV' === format);

  if (
    !csvDownload ||
    !csvDownload.url ||
    !csvDownload.fileName ||
    !csvDownload.md5
  ) {
    throw 'error  no url or filename for csv download';
  }

  return csvDownload;
};

const maybeDownloadProduct = async (
  productId,
  version,
  ignoreCachedFile = false
) => {
  let downloadInfo, csvDownloadInfo;

  try {
    downloadInfo = await getProductDownloadInfo(productId, version);
    csvDownloadInfo = await getProductCsvDownloadInfo(downloadInfo);
  } catch (error) {
    throw error;
  }

  const dir = path.join(os.tmpdir(), 'os', 'OpenNames', version);
  const filePath = path.join(dir, csvDownloadInfo.fileName);

  await fs.ensureDir(dir);

  const exists = await fs.pathExists(filePath);

  if (!ignoreCachedFile && exists) {
    const hash = await md5File(filePath);

    if (hash.toUpperCase() === csvDownloadInfo.md5.toUpperCase()) {
      // console.log('file exists already and matches md5');
      return filePath;
    }
  }

  try {
    const { response } = await downloadFile(csvDownloadInfo.url, filePath);
    /* Cannot trigger error here, downloadFile is unit tested */
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }

  const hash = await md5File(filePath);

  /* Depends on 3rd party API or download failure */
  /* c8 ignore next 3 */
  if (hash.toUpperCase() !== csvDownloadInfo.md5.toUpperCase()) {
    throw "downloaded file does not match API's md5";
  }

  return filePath;
};

export {
  getOsProductVersion,
  getProductDownloadInfo,
  getProductCsvDownloadInfo,
  downloadFile,
  maybeDownloadProduct,
};
