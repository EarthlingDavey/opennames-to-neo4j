import path from 'path';
import fs from 'fs-extra';

import { maybeDownloadProduct } from '../models/Product.js';

import { extractZip, getFilesArray } from '../models/File.js';

import {
  readDataSourceHeaders,
  dbSaveDataSources,
} from '../models/DataSource.js';

const fetchDataSources = async (session, options, apiVersion) => {
  console.log('>>>>>> Start fetchDataSources');

  const zipFilePath = await maybeDownloadProduct('OpenNames', apiVersion);

  if (!zipFilePath) return;

  const extractTarget = path.resolve('/tmp', 'os', 'OpenNames', apiVersion);

  const extracted = await extractZip(zipFilePath, extractTarget);

  if (!extracted) return;

  const dataDir = `${extractTarget}/DATA`;
  let filesArray = await getFilesArray(dataDir);

  if (!filesArray) return;

  if (options.includeFiles?.length) {
    filesArray = filesArray.filter((fileName) =>
      options.includeFiles.includes(fileName)
    );
  }

  const headers = await readDataSourceHeaders(extractTarget);

  if (!headers) return;

  const dbDataSources = await dbSaveDataSources(
    session,
    apiVersion,
    dataDir,
    filesArray,
    headers,
    options
  );

  console.log('<<<<<< End fetchDataSources');

  return dbDataSources;
};

export { fetchDataSources };
