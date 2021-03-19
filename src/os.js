import axios from 'axios';
import fs from 'fs-extra';
import md5File from 'md5-file';

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
    // what now?
    console.log(err);
  });
  return product;
}
async function getOsProductVersion(id) {
  const product = await getOsProduct(id);
  if (!product?.data.version) {
    console.error('no data');
    return;
  }
  return product.data.version;
}

const getProductDownloadInfo = async (id) => {
  const product = await getOsProduct(id);
  if (!product?.data.downloadsUrl) {
    console.error('no downloadsUrl');
    return;
  }
  console.log(product.data.downloadsUrl);
  const downloads = await axios(product.data.downloadsUrl).catch((err) => {
    // what now?
    console.error('no download data');
  });

  return downloads.data.find(({ format }) => 'CSV' === format);
};

const maybeDownloadProduct = async (productId, version) => {
  const downloadInfo = await getProductDownloadInfo(productId);
  console.log(downloadInfo);

  if (!downloadInfo.url || !downloadInfo.fileName) {
    return;
  }
  console.log('hi');

  const dir = `/tmp/os/${productId}/${version}`;
  const filePath = `${dir}/${downloadInfo.fileName}`;

  await fs.ensureDir(dir);

  const exists = await fs.pathExists(filePath);

  if (exists) {
    const hash = await md5File(filePath);

    if (hash.toUpperCase() === downloadInfo.md5.toUpperCase()) {
      console.log('file exists already and matches md5');
      return filePath;
    }
  }

  const response = await axios({
    url: downloadInfo.url,
    responseType: 'stream',
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(filePath))
          .on('finish', () => resolve())
          .on('error', (e) => reject(e));
      })
  );

  const hash = await md5File(filePath);

  if (hash.toUpperCase() !== downloadInfo.md5.toUpperCase()) {
    console.error("downloaded file does not match API's md5");
    return false;
  }

  return filePath;
};

export { getOsProductVersion, getProductDownloadInfo, maybeDownloadProduct };
