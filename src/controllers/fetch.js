import path from 'path';
import fs from 'fs-extra';
import os from 'os';

import { maybeDownloadProduct } from '../models/Product.js';

import { extractZip, getCsvFilesArray } from '../utils/files.js';

import { readDataSourceHeaders } from '../models/DataSource.js';
/**
 * Test coverage notes.
 * c8 ignore next is used when this function cannot trigger
 * error states from the contained functions.
 * The functions in question have their own tests.
 * @param {Object} options
 * @param {String} version
 * @returns {Object}
 */
const fetchDataSources = async (options, version) => {
  console.log('>>>>>> Start fetchDataSources', { version });

  let zipFilePath, extracted, filesArray, headers;

  try {
    zipFilePath = await maybeDownloadProduct('OpenNames', version);
  } catch (error) {
    throw error;
  }

  // const extractTarget = path.resolve('./tmp', version);
  const extractTarget = path.join(os.tmpdir(), 'os', 'OpenNames', version);

  try {
    extracted = await extractZip(zipFilePath, extractTarget);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }

  const dataDir = path.join(extractTarget, 'DATA');

  try {
    filesArray = await getCsvFilesArray(dataDir);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }

  if (options.includeFiles?.length) {
    filesArray = filesArray.filter((fileName) =>
      options.includeFiles.includes(fileName)
    );
  }

  try {
    headers = await readDataSourceHeaders(extractTarget);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }

  console.log('<<<<<< End fetchDataSources');

  return {
    dataDir,
    filesArray,
    headers,
  };
};

export { fetchDataSources };
