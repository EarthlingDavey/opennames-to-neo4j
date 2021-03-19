import path from 'path';
import fs from 'fs-extra';

import { getOsProductVersion, maybeDownloadProduct } from './os.js ';

import { driver, dbImport } from './db.js';

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
} from './models/DataSource.js';

import { processPlaces, importPlaces } from './models/Place.js';

import { extractZip, getFilesArray, deleteFiles } from './disk.js';

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

  // console.log({ dbResult });

  const { headers } = dbResult;
  let { dataSources } = dbResult;

  // console.log(dataSources);

  if (options.includeFiles) {
    dataSources = dataSources.filter((x) =>
      options.includeFiles.includes(x.fileName)
    );
  }

  // console.log(dataSources);

  /**
   * Process
   */

  const toProcess = dataSources.filter((x) => !x.processed);

  if (toProcess.length) {
    for (const dataSource of toProcess) {
      const processedDataSource = await processPlaces(
        dataSource,
        headers,
        options,
        productId
      );
      if (!processedDataSource) {
        console.error('dataSource failed to process', { dataSource });
        continue;
      }

      const updatedDataSource = await updateDataSource(
        session,
        processedDataSource
      );
      if (!updatedDataSource) {
        console.error('dataSource failed to update in db', {
          processedDataSource,
        });
        continue;
      }
      // Update the dataSources source of truth here.
      const foundIndex = dataSources.findIndex(
        (x) => x.id == updatedDataSource.id
      );
      if (foundIndex >= 0) {
        dataSources[foundIndex] = updatedDataSource;
      }
    }
  }

  /**
   * Import
   */

  const toImport = dataSources.filter(
    (x) => x.processed && !x.imported && x.validRows > 0
  );

  if (toImport.length) {
    for (const dataSource of toImport) {
      const importedDataSource = await importPlaces(session, dataSource);

      if (!importedDataSource) {
        console.error('dataSource failed to import', { dataSource });
        continue;
      }
      // Update the dataSources source of truth here.
      const foundIndex = dataSources.findIndex(
        (x) => x.id == importedDataSource.id
      );
      if (foundIndex >= 0) {
        dataSources[foundIndex] = importedDataSource;
      }
    }
  }

  /**
   * Clean up
   */

  const toCleanUp = dataSources.filter(
    (x) => x.processed && (x.imported || 0 === x.validRows) && !x.cleaned
  );

  if (toCleanUp.length) {
    // let result = objArray.map(({ foo }) => foo);

    for (const dataSource of toCleanUp) {
      const deleteSuccess = await deleteFiles([
        dataSource.importFilePath,
        dataSource.filePath,
      ]);

      if (!deleteSuccess) {
        console.error('clean up failed to delete files for dataSource', {
          dataSource,
        });
        continue;
      }

      const updatedDataSource = await updateDataSource(session, {
        id: dataSource.id,
        cleaned: true,
      });

      console.log({ updatedDataSource });
    }
  }

  console.log('closing session');
  session.close();
};

const getDataSources = async (session, productId, options, apiVersion) => {
  console.log('>>>>>> Start getDataSources');

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

  console.log('<<<<<< End getDataSources');

  return dbDataSources;
};

// main('OpenNames', {
//   importBatchSize: 10,
//   includeFiles: [
//     'NA80.csv',
//     //  "SN84.csv"
//   ],
//   dirs: {
//     neo4jImport: '/app/data',
//   },
// });

const helloFromOpennamesToNeo4j = () => {
  console.log('helloFromOpennamesToNeo4j');
};

export default main;

export { helloFromOpennamesToNeo4j };
