import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import md5File from 'md5-file';

import { downloadFile } from '../utils/files.js';

async function getOsProductList() {
  const productList = await axios(
    'https://api.os.uk/downloads/v1/products'
  ).catch((err) => {
    // what now?
    console.log(err);
  });
  return productList;
}

async function getOsProduct(id) {
  const product = await axios(
    `https://api.os.uk/downloads/v1/products/${id}`
  ).catch((err) => {
    throw err.response?.status ? err.response?.status : 'error';
  });
  return product;
}

async function getOsProductVersion(id) {
  try {
    const product = await getOsProduct(id);
    if (!product?.data.version) {
      console.error('no data');
    }
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

  if (!product?.data.downloadsUrl) {
    throw `no downloadsUrl: ${version}`;
  }

  // console.log(product.data.downloadsUrl);
  const downloads = await axios(product.data.downloadsUrl).catch((err) => {
    // what now?
    console.error('no download data');
  });

  const csvDownload = downloads.data.find(({ format }) => 'CSV' === format);

  if (!csvDownload || !csvDownload.url || !csvDownload.fileName) {
    throw 'error  no url or filename for csv download';
  }

  return csvDownload;
};

const maybeDownloadProduct = async (productId, version) => {
  let downloadInfo;

  try {
    downloadInfo = await getProductDownloadInfo(productId, version);
  } catch (error) {
    console.log({ error });
    throw error;
  }

  const dir = path.join(os.tmpdir(), 'os', 'OpenNames', version);
  const filePath = path.join(dir, downloadInfo.fileName);

  await fs.ensureDir(dir);

  const exists = await fs.pathExists(filePath);

  if (exists) {
    const hash = await md5File(filePath);

    if (hash.toUpperCase() === downloadInfo.md5.toUpperCase()) {
      console.log('file exists already and matches md5');
      return filePath;
    }
  }

  const response = await downloadFile(downloadInfo.url, filePath);

  // TODO: Check response

  const hash = await md5File(filePath);

  if (hash.toUpperCase() !== downloadInfo.md5.toUpperCase()) {
    throw "downloaded file does not match API's md5";
  }

  return filePath;
};

export {
  getOsProductVersion,
  getProductDownloadInfo,
  downloadFile,
  maybeDownloadProduct,
};
