import { getOsProductVersion, maybeDownloadProduct } from './os.js ';

import { driver, dbImport } from './db.js';

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
} from './models/DataSource.js';

import { processPlaces } from './models/Place.js';

import { extractZip, getFilesArray } from './disk.js';

console.log('hello world');

const main = async (productId, options) => {
  /**
   * Is there a new version?
   */

  const apiVersion = await getOsProductVersion(productId);

  let session = driver.session();

  let dbResult = await getDbDataSources(session, productId, apiVersion);

  if (!dbResult?.dataSources?.length) {
    dbResult = await getDataSources(session, productId, options, apiVersion);
  }

  if (!dbResult?.dataSources?.length || !dbResult?.headers?.length) {
    console.error('no dataSources after running getDataSources');
  }

  const { headers } = dbResult;
  let { dataSources } = dbResult;

  if (options.includeFiles) {
    dataSources = dataSources.filter((x) =>
      options.includeFiles.includes(x.file)
    );
  }

  const toProcess = dataSources.filter((x) => !x.processed);

  if (toProcess.length) {
    toProcess.forEach((dataSource) => {
      processPlaces(dataSource, headers);
    });
  }

  // console.log(toProcess);
  // console.log(headers);

  // if (extracted) {
  //   await dbImport(session, productId, extractTarget);
  // }

  session.close();

  // console.log({ zipFilePath });

  // const
};

const getDataSources = async (session, productId, options, apiVersion) => {
  const zipFilePath = await maybeDownloadProduct(productId, apiVersion);

  if (!zipFilePath) {
    console.error('error downloading zip');
    return;
  }

  const extractDir = options.neo4jImportDir || options.publicDir;
  const extractTarget = `${extractDir}/os/${productId}/${apiVersion}`;

  // TODO: - make extracted files go to /tmp directory

  const extracted = await extractZip(zipFilePath, extractTarget);

  if (!extracted) {
    console.error('error extracting zip');
    return;
  }

  const dataDir = `${extractTarget}/DATA`;
  const filesArray = await getFilesArray(dataDir);

  if (!filesArray) {
    console.error('error array of files was empty');
    return;
  }

  const headers = await readDataSourceHeaders(extractTarget);

  console.log({ headers });

  if (!headers) {
    console.error('error could not read csv headers');
    return;
  }

  // Write some data to the db to say that extraction was completed ok.

  const dbDataSources = await dbSaveDataSources(
    session,
    productId,
    apiVersion,
    dataDir.replace('/app/data/', ''),
    filesArray,
    headers
  );

  return dbDataSources;
};

main('OpenNames', {
  neo4jImportDir: '/app/data',
  importBatchSize: 10,
  includeFiles: ['NA80.csv', 'SN84.csv'],
});
