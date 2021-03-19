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
import { getNeo4jSession, mergeByProperty } from './utils/utils.js';
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
   * Start a neo4j db session.
   */

  const { session, shouldCloseSession } = getNeo4jSession(connection);

  const dataSources = await main(session, options);

  /**
   * Maybe close the neo4j db session.
   */
  if (shouldCloseSession) {
    console.log('closing session');
    session.close();
  }

  return dataSources;
};

const main = async (session, options) => {
  // TODO: Allow for serving of processed csv files.
  // in-case db is not sharing a volume with the app.

  // TODO: return a summary
  // TODO: only do x first DataSources

  // TODO: remove need for productId
  const productId = 'OpenNames';

  /**
   * Get product version from the API
   */

  const apiVersion = await getOsProductVersion(productId);

  /**
   * Is there db data for this version?
   */

  let dbResult = await getDbDataSources(session, productId, apiVersion);

  /**
   * If there is NOT db data for this version.
   * Then fetch it.
   */
  if (!dbResult?.dataSources?.length) {
    dbResult = await fetchDataSources(session, productId, options, apiVersion);
  }

  if (!dbResult?.dataSources?.length || !dbResult?.headers?.length) {
    console.error('no dataSources after running fetchDataSources');
    return [];
  }

  let { dataSources } = dbResult;

  /**
   * Filter the dataSources
   */

  if (options.includeFiles) {
    dataSources = dataSources.filter((x) =>
      options.includeFiles.includes(x.fileName)
    );
  }

  /**
   * Process
   */

  const toProcess = dataSources.filter((x) => !x.processed);

  if (toProcess.length) {
    let processedDataSources = [];

    for (const dataSource of toProcess) {
      const processedDataSource = await processPlaces(
        dataSource,
        dbResult.headers,
        options,
        productId
      );
      if (!processedDataSource) continue;

      const updatedDataSource = await updateDataSource(
        session,
        processedDataSource
      );
      if (!updatedDataSource) continue;

      processedDataSources.push(updatedDataSource);
    }

    processedDataSources.length &&
      mergeByProperty(dataSources, processedDataSources, 'id');
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
      const importedDataSource = await importPlaces(session, dataSource);

      if (importedDataSource) {
        importedDataSources.push(importedDataSource);
      }
    }

    importedDataSources.length &&
      mergeByProperty(dataSources, importedDataSources, 'id');
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
    }

    cleanedDataSources.length &&
      mergeByProperty(dataSources, cleanedDataSources, 'id');
  }

  return dataSources;
};

export default sessionWrapper;
