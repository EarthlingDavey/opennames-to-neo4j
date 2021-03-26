import fs from 'fs-extra';
/**
 * Defaults and constants.
 */
import { defaultOptions } from './utils/defaults.js';
/**
 * Models.
 */
import { getDbDataSources, updateDataSource } from './models/DataSource.js';
import { deleteFiles } from './models/File.js';
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

const sessionWrapper = async (connection = {}, options) => {
  /**
   * Apply default function options.
   */
  options = mergeDeep(defaultOptions, options);

  /**
   * Start a neo4j db session.
   */

  const { session, shouldCloseSession } = getNeo4jSession(connection);

  const result = await main(session, options);

  /**
   * Maybe close the neo4j db session.
   */
  if (shouldCloseSession) {
    console.log('closing session');
    session.close();
  }

  return result;
};

const main = async (session, options) => {
  // TODO: Allow for serving of processed csv files.
  // in-case db is not sharing a volume with the app.

  let summary = {};
  let errors = [];

  // console.log(options);
  // return;

  /**
   * Get product version from the API
   */

  const apiVersion = await getOsProductVersion('OpenNames');

  /**
   * Is there db data for this version?
   */

  let dbResult = await getDbDataSources(session, apiVersion, {
    batchSize: options.batchSize,
    includeFiles: options.includeFiles,
  });

  /**
   * If there is NOT db data for this version.
   * Then fetch it.
   */
  if (!dbResult?.dataSources?.length) {
    dbResult = await fetchDataSources(session, options, apiVersion);
    summary.fetched = true;
  } else {
    summary.cached = true;
  }

  if (!dbResult?.dataSources?.length || !dbResult?.headers?.length) {
    // console.error('no dataSources after running fetchDataSources');
    errors.push('no dataSources after running fetchDataSources');
    return { summary, errors, dataSources: [] };
  }

  let { dataSources } = dbResult;

  if (dataSources.find((x) => !x.cleaned) === undefined) {
    console.debug(
      'nothing to do, everything has been processed, imported and cleaned'
    );
    summary.complete = true;
    return { summary, errors, dataSources: [] };
  }

  /**
   * Filter the dataSources
   */

  /**
   * Process
   */

  const toProcess = dataSources.filter(
    (x) => !x.processed || !x.importFilePath
  );

  if (toProcess.length) {
    let processedDataSources = [];

    for (const dataSource of toProcess) {
      /**
       * Does the source csv file is exist?
       * They are stored in /tmp so there is potential for deletion
       */
      if (!(await fs.existsSync(dataSource.filePath))) {
        await fetchDataSources(session, options, apiVersion);

        if (!(await fs.existsSync(dataSource.filePath))) {
          errors.push('no dataSources after running fetchDataSources');
          return { summary, errors, dataSources: [] };
        }
      }

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
      );

      console.log(`process loop, waiting for ${options.waits.process} seconds`);
      await waitSeconds(options.waits.process);
      console.log('finished waiting');

      if (!updatedDataSource) continue;

      processedDataSources.push(updatedDataSource);
    }

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

  if (toImport.length) {
    let importedDataSources = [];
    for (const dataSource of toImport) {
      /**
       * Does the processed csv file is exist?
       * They are stored in /tmp so there is potential for deletion
       */
      if (!(await fs.existsSync(dataSource.importFilePath))) {
        await updateDataSource(session, {
          ...dataSource,
          processed: null,
          importFilePath: null,
        });
        continue;
      }

      const importedDataSource = await importPlaces(
        session,
        dataSource,
        options
      );

      if (importedDataSource) {
        importedDataSources.push(importedDataSource);
      }

      console.log(`import loop, waiting for ${options.waits.import} seconds`);
      await waitSeconds(options.waits.import);
      console.log('finished waiting');
    }

    if (importedDataSources.length) {
      summary.imported = importedDataSources.length;
      mergeByProperty(dataSources, importedDataSources, 'id');
    }
  }

  /**
   * Clean up
   */

  const toCleanUp = dataSources.filter(
    (x) => x.processed && (x.imported || 0 === x.validRows) && !x.cleaned
  );

  if (toCleanUp.length) {
    let cleanedDataSources = [];

    for (const dataSource of toCleanUp) {
      const deleteSuccess = await deleteFiles([
        dataSource.importFilePath,
        dataSource.filePath,
      ]);

      if (!deleteSuccess) continue;

      const updatedDataSource = await updateDataSource(session, {
        id: dataSource.id,
        importFilePath: null,
        filePath: null,
        cleaned: true,
      });

      cleanedDataSources.push(updatedDataSource);

      console.log(`clean up loop, waiting for ${options.waits.clean} seconds`);
      await waitSeconds(options.waits.clean);
      console.log('finished waiting');
    }

    if (cleanedDataSources.length) {
      summary.cleaned = cleanedDataSources.length;
      mergeByProperty(dataSources, cleanedDataSources, 'id');
    }
  }

  return { summary, errors, dataSources };
};

export default sessionWrapper;
