import path from 'path';
import fs from 'fs-extra';

import { maybeDownloadProduct } from '../models/Product.js';

import { extractZip, getFilesArray } from '../models/File.js';

import {
  readDataSourceHeaders,
  dbSaveDataSources,
} from '../models/DataSource.js';

const fetchDataSources = async (session, productId, options, apiVersion) => {
  console.log('>>>>>> Start fetchDataSources');

  const dirs = options?.dirs || { neo4jImport: '/app/data' };

  const zipFilePath = await maybeDownloadProduct(productId, apiVersion);

  if (!zipFilePath) return;

  const extractTarget = `/tmp/os/${productId}/${apiVersion}`;

  const extracted = await extractZip(zipFilePath, extractTarget);

  if (!extracted) return;

  const dataDir = `${extractTarget}/DATA`;
  const filesArray = await getFilesArray(dataDir);

  if (!filesArray) return;

  const headers = await readDataSourceHeaders(extractTarget);

  if (!headers) return;

  // Write some data to the db to say that extraction was completed ok.

  // TODO: helper function for paths

  const importFileDir = path.resolve(
    dirs.neo4jImport,
    'os',
    productId,
    apiVersion
  );

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
