import path from 'path';
import fs from 'fs-extra';

import { maybeDownloadProduct } from '../os.js ';
import { extractZip, getFilesArray, deleteFiles } from '../disk.js';

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
} from '../models/DataSource.js';

const fetchDataSources = async (session, productId, options, apiVersion) => {
  console.log('>>>>>> Start fetchDataSources');

  const dirs = options?.dirs || { neo4jImport: '/app/data' };

  const zipFilePath = await maybeDownloadProduct(productId, apiVersion);

  if (!zipFilePath) {
    console.error('error downloading zip');
    return;
  }

  const extractTarget = `/tmp/os/${productId}/${apiVersion}`;

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

  if (!headers) {
    console.error('error could not read csv headers');
    return;
  }

  // Write some data to the db to say that extraction was completed ok.

  const importFileDir = path.resolve(
    dirs.neo4jImport,
    'os',
    productId,
    apiVersion
  );

  console.log({ importFileDir });

  const dbDataSources = await dbSaveDataSources(
    session,
    productId,
    apiVersion,
    dataDir,
    filesArray,
    headers,
    importFileDir
  );

  console.log('<<<<<< End fetchDataSources');

  return dbDataSources;
};

export { fetchDataSources };
