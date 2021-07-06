import fs from 'fs-extra';
/**
 * Defaults and constants.
 */
import { defaultOptions } from './utils/defaults.js';

/**
 * Models.
 */
import {
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
} from './models/DataSource.js';
import { deleteFiles } from './utils/files.js';
import { processPlaces, importPlaces } from './models/Place.js';
import { getOsProductVersion } from './models/Product.js';

/**
 * Helpers.
 */
import {
  getNeo4jSession,
  mergeByProperty,
  mergeDeep,
  waitSeconds,
} from './utils/utils.js';

/**
 * Fetch.
 */
import { fetchDataSources } from './controllers/fetch.js';

/**
 * Ensure the main function is passed a database session.
 * Run the main function.
 * And, the session is closed afterwards.
 *
 * @param {Object} connection
 * @param {Object} connection.session neo4j session
 * @param {Object} connection.driver neo4j driver
 * @param {{uri: String, user: String, password: String}} connection.strings
 *   neo4j connection strings
 * @param {Object} options
 * @returns
 */

const sessionWrapper = async (connection = {}, options = {}) => {
  /**
   * Apply default function options.
   */
  options = mergeDeep(defaultOptions, options);
  const debug = options?.functions?.debug || (() => null);

  debug('>>>>>> Start sessionWrapper');

  // // console.log(global);

  // return;

  /**
   * Start a neo4j db session.
   */
  let session, shouldCloseSession;
  try {
    ({ session, shouldCloseSession } = getNeo4jSession(connection));
  } catch (error) {
    throw error;
  }

  let result;
  try {
    result = await main(session, options);
  } catch (error) {
    throw error;
  } finally {
    /**
     * Maybe close the neo4j db session.
     */
    if (shouldCloseSession) {
      session.close();
    }
  }

  debug('<<<<<< End sessionWrapper');
  return result;
};

const main = async (session, options) => {
  const debug = options?.functions?.debug || (() => null);
  debug('>>>>>> Start main');

  let summary = {};
  let errors = [];

  // console.log(options);
  // return;

  /**
   * Get product version from the API
   */

  const apiVersion = await getOsProductVersion('OpenNames').catch((e) => {
    throw e;
  });
  debug(`apiVersion: ${apiVersion}`);

  /**
   * Is there db data for this version?
   */

  let dbResult = await getDbDataSources(session, apiVersion, {
    batchSize: options.batchSize,
    includeFiles: options.includeFiles,
  }).catch((e) => {
    throw e;
  });

  debug(`getDbDataSources length: ${dbResult?.dataSources?.length}`);

  /**
   * If there is NOT db data for this version.
   * Then fetch it.
   */
  if (!dbResult?.dataSources?.length) {
    const fetchedDataSources = await fetchDataSources(options, apiVersion);

    if (fetchedDataSources) {
      dbResult = await dbSaveDataSources(session, {
        options,
        version: apiVersion,
        ...fetchedDataSources,
      }).catch((e) => {
        throw e;
      });
      summary.fetched = true;
      debug(`dbSaveDataSources length: ${dbResult?.dataSources?.length}`);
      debug(`using fetched DataSources: ${summary.fetched}`);
    }
  } else {
    summary.cached = true;
    debug(`using cached DataSources: ${summary.cached}`);
  }

  if (!dbResult?.dataSources?.length || !dbResult?.headers?.length) {
    // console.error('no dataSources after running fetchDataSources');
    errors.push('no dataSources after running fetchDataSources');
    return { summary, errors, dataSources: [] };
  }

  let { dataSources } = dbResult;

  console.log(dataSources);

  /**
   * Filter
   */
  if (options.includeFiles?.length) {
    dataSources = dataSources.filter(({ fileName }) =>
      options.includeFiles.includes(fileName)
    );
    debug(`dataSources filtered length: ${dataSources.length}`);
  }

  if (dataSources.find((x) => !x.cleaned) === undefined) {
    debug('nothing to do, everything has been processed, imported and cleaned');
    summary.complete = true;
    return { summary, errors, dataSources: [] };
  }

  /**
   * Process
   */

  const toProcess = dataSources.filter(
    (x) => (!x.processed || !x.importFilePath) && x.filePath
  );

  debug(`dataSources to process: ${toProcess.length}`);

  if (toProcess.length) {
    let processedDataSources = [];

    debug(`>>>>>> Start process loop`);
    for (const dataSource of toProcess) {
      /**
       * Does the source csv file is exist?
       * They are stored in /tmp so there is potential for deletion
       */
      if (!(await fs.existsSync(dataSource.filePath))) {
        await fetchDataSources(options, apiVersion);

        if (!(await fs.existsSync(dataSource.filePath))) {
          errors.push('no dataSources after running fetchDataSources');
          return { summary, errors, dataSources: [] };
        }
      }
      debug(`will process: ${dataSource.id}`);

      let processedDataSource;

      try {
        processedDataSource = await processPlaces(
          dataSource,
          dbResult.headers,
          options
        );
      } catch (error) {
        console.error(error, { dataSource });
        continue;
      }

      if (!processedDataSource) continue;

      const updatedDataSource = await updateDataSource(
        session,
        processedDataSource
      ).catch((e) => {
        throw e;
      });

      debug(`process loop, waiting for: ${options.waits.process}s`);
      await waitSeconds(options.waits.process);

      if (!updatedDataSource) continue;

      processedDataSources.push(updatedDataSource);
    }
    debug(`<<<<<< End process loop`);

    if (processedDataSources.length) {
      summary.processed = processedDataSources.length;
      mergeByProperty(dataSources, processedDataSources, 'id');
    }
  }

  /**
   * Import
   */

  const toImport = dataSources.filter(
    (x) => x.importFilePath && !x.imported && x.validRows > 0
  );

  debug(`dataSources to import: ${toImport.length}`);

  if (toImport.length) {
    let importedDataSources = [];

    debug(`>>>>>> Start import loop`);
    for (const dataSource of toImport) {
      /**
       * Does the processed csv file is exist?
       * They are stored in /tmp so there is potential for deletion
       */
      if (!(await fs.existsSync(dataSource.importFilePath))) {
        debug(`import loop file not exist`);

        await updateDataSource(session, {
          ...dataSource,
          processed: null,
          importFilePath: null,
        }).catch((e) => {
          throw e;
        });
        continue;
      }

      debug(`will import: ${dataSource.id}`);

      const importedDataSource = await importPlaces(
        session,
        dataSource,
        options
      ).catch((e) => {
        throw e;
      });

      debug({ importedDataSource });

      if (importedDataSource) {
        importedDataSources.push(importedDataSource);
      }

      debug(`import loop, waiting for: ${options.waits.import}s`);
      await waitSeconds(options.waits.import);
    }
    debug(`<<<<<< End import loop`);

    if (importedDataSources.length) {
      debug(`merging importedDataSources`);
      summary.imported = importedDataSources.length;
      mergeByProperty(dataSources, importedDataSources, 'id');
    }
  }

  /**
   * Clean up
   */

  debug({ dataSources });

  const toCleanUp = dataSources.filter(
    (x) =>
      x.processed &&
      (x.imported || 0 === x.validRows) &&
      x.importFilePath &&
      x.filePath &&
      !x.cleaned
  );

  debug(`dataSources to clean: ${toCleanUp.length}`);

  if (toCleanUp.length) {
    let cleanedDataSources = [];

    debug(`>>>>>> Start clean up loop`);
    for (const dataSource of toCleanUp) {
      debug(`will clean up: ${dataSource.id}`);

      const deleteSuccess = await deleteFiles([
        dataSource.importFilePath,
        dataSource.filePath,
      ]).catch((e) => {
        throw e;
      });

      if (!deleteSuccess) continue;

      const updatedDataSource = await updateDataSource(
        session,
        {
          id: dataSource.id,
          importFilePath: null,
          filePath: null,
          cleaned: true,
        },
        debug
      ).catch((e) => {
        throw e;
      });

      cleanedDataSources.push(updatedDataSource);

      debug(`clean up loop, waiting for: ${options.waits.clean}s`);
      await waitSeconds(options.waits.clean);
    }
    debug(`<<<<<< End clean up loop`);

    if (cleanedDataSources.length) {
      summary.cleaned = cleanedDataSources.length;
      mergeByProperty(dataSources, cleanedDataSources, 'id');
    }
  }

  debug('<<<<<< End main');
  return { summary, errors, dataSources };
};

export default sessionWrapper;
