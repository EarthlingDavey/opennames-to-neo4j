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
  /* debug has unit tests */
  /* c8 ignore next 1 */
  const debug = options?.functions?.debug || (() => null);

  debug('>>>>>> Start fetchDataSources', { version });
  debug(`version: ${version}`);

  let zipFilePath, extracted, filesArray, headers;

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

  const dataDir = path.join(extractTarget, 'DATA');
  debug(`dataDir: ${dataDir}`);

  try {
    filesArray = await getCsvFilesArray(dataDir);
    /* c8 ignore next 3 */
  } catch (error) {
    throw error;
  }
  debug(`filesArray length: ${filesArray.length}`);

  if (options.includeFiles?.length) {
    filesArray = filesArray.filter((fileName) =>
      options.includeFiles.includes(fileName)
    );
    debug(`filesArray filtered length: ${filesArray.length}`);
  }

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
