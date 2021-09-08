import path from 'path';
import fs from 'fs-extra';
import os from 'os';

import { maybeDownloadProduct } from '../models/Product.js';

import {
  extractZip,
  getFolderFromList,
  getCsvFilesArray,
} from '../utils/files.js';

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
  /* debug has unit tests */
  /* c8 ignore next 1 */
  const debug = options?.functions?.debug || (() => null);

  debug('>>>>>> Start fetchDataSources');
  debug(`version: ${version}`);

  let zipFilePath, extracted, dataFolder, filesArray, headers;

  try {
    zipFilePath = await maybeDownloadProduct('OpenNames', version);
  } catch (error) {
    throw error;
  }

  debug(`zipFilePath: ${zipFilePath}`);

  // const extractTarget = path.resolve('./tmp', version);
  const extractTarget = path.join(os.tmpdir(), 'os', 'OpenNames', version);
  debug(`extractTarget: ${extractTarget}`);

  try {
    extracted = await extractZip(zipFilePath, extractTarget);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }
  debug(`extracted: ${extracted}`);

  try {
    dataFolder = await getFolderFromList(extractTarget, [
      'data',
      'Data',
      'DATA',
    ]);
  } catch (error) {
    throw error;
  }
  debug(`dataFolder: ${dataFolder}`);

  const dataDir = path.join(extractTarget, dataFolder);
  debug(`dataDir: ${dataDir}`);

  try {
    filesArray = await getCsvFilesArray(dataDir);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }
  debug(`filesArray length: ${filesArray.length}`);

  try {
    headers = await readDataSourceHeaders(extractTarget);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }
  debug(`headers length: ${headers.length}`);

  debug('<<<<<< End fetchDataSources');
  return {
    dataDir,
    filesArray,
    headers,
  };
};

export { fetchDataSources };
