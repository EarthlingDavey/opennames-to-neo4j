import fs from 'fs-extra';
import path from 'path';
import csv from '@fast-csv/parse';

import { getFolderFromList } from '../utils/files.js';
import { toNeo4jInteger } from '../utils/utils.js';

const readDataSourceHeaders = async (dir) => {
  // console.log('>>>>>> Start readDataSourceHeaders');

  let docFolder;

  try {
    docFolder = await getFolderFromList(path.resolve(dir), [
      'doc',
      'docs',
      'Doc',
      'Docs',
      'DOC',
      'DOCS',
    ]);
  } catch (error) {
    throw error;
  }

  try {
    const filePath = path.join(
      path.resolve(dir),
      docFolder,
      'OS_Open_Names_Header.csv'
    );
    const headers = await new Promise((resolve, reject) => {
      let headers = [];
      fs.createReadStream(filePath)
        .on('error', (error) => reject(error))
        .pipe(csv.parse({ headers: false }))
        .on('error', (error) => reject(error))
        .on('data', (row) => (headers = row))
        .on('end', () => resolve(headers));
    });
    return headers;
  } catch (error) {
    throw error;
  }
};

const getDbDataSources = async (session, version, options) => {
  // console.log('>>>>>> Start getDbDataSources');
  // console.log({ version, options });
  // console.log(options.includeFiles);

  if (!version) {
    throw 'getDbDataSources, property(s) is missing';
  }

  const query = `
      MATCH (product:OsProduct {
        id: $productId
      })-[:HAS_VERSION]->(v:OsVersion {
        id: $version
      })-[:HAS_FILE]->(d:DataSource)

      ${
        options?.includeFiles && options?.includeFiles.length
          ? `WHERE d.fileName IN $options.includeFiles`
          : ``
      }

      WITH d, v

      ORDER BY d.processed DESC, d.imported DESC, d.cleaned DESC, d.id

      RETURN 
        COLLECT({ 
          id: d.id,
          fileName: d.fileName,
          filePath: d.filePath,
          importFilePath: d.importFilePath,
          importFileUrl: d.importFileUrl,
          processed: d.processed,
          imported: d.imported,
          cleaned: d.cleaned,
          validRows: d.validRows,
          version: v.id
        })
          ${options?.batchSize ? `[0..$options.batchSize]` : ``}
        AS 
          dataSource,
        v.headers AS headers 
      `;

  try {
    const result = await session.run(query, {
      productId: 'OpenNames',
      version,
      options,
    });
    return {
      dataSources: result.records[0]?.get('dataSource'),
      headers: result.records[0]?.get('headers'),
    };
  } catch (error) {
    throw error;
  }
};

const dbSaveDataSources = async (
  session,
  { version, dataDir, filesArray, headers, options }
) => {
  /* debug has unit tests */
  /* c8 ignore next 1 */
  const debug = options?.functions?.debug || (() => null);
  debug('>>>>>> Start dbSaveDataSources');

  if (!version || !dataDir || !filesArray || !headers) {
    throw 'dbSaveDataSources, properties are missing';
  }

  // return;
  try {
    const result = await session.run(
      `
      MERGE (product:OsProduct {
        id: $productId
      })
      MERGE (product)-[:HAS_VERSION]->(v:OsVersion {
        id: $version
      })
      SET v.headers = $headers

      WITH 
      product, 
      v, 
      $dataDir AS dataDir,
      $filesArray AS filesArray,
      $version AS version

      UNWIND filesArray as fileName

      MERGE (d:DataSource {
        id: version + "/" + fileName
      })
      ON CREATE SET
      d.createdAt = TIMESTAMP()
      SET
      d.fileName = fileName,
      d.filePath = dataDir + "/" + fileName,
      d.updatedAt = TIMESTAMP()

      MERGE (v)-[:HAS_FILE]->(d)

      RETURN 
        COLLECT({ 
          id: d.id,
          fileName: d.fileName,
          filePath: d.filePath,
          importFilePath: d.importFilePath,
          importFileUrl: d.importFileUrl,
          processed: d.processed,
          imported: d.imported,
          cleaned: d.cleaned,
          validRows: d.validRows,
          version: v.id
        })
          ${options?.batchSize ? `[0..$options.batchSize]` : ``}
        AS 
          dataSource,
        product AS product, 
        v.headers AS headers
      `,
      {
        productId: 'OpenNames',
        version,
        dataDir,
        filesArray,
        headers,
        options: { batchSize: options?.batchSize },
      }
    );

    debug('<<<<<< End dbSaveDataSources');
    return {
      dataSources: result.records[0]?.get('dataSource'),
      headers: result.records[0]?.get('headers'),
    };
  } catch (error) {
    throw error;
  }
};

const updateDataSource = async (
  session,
  processedDataSource,
  debug = () => {}
) => {
  debug('>>>>>> Start updateDataSource');

  const { id, ...properties } = processedDataSource;

  // debug(`updateDataSource updating id: ${id}`);

  if (!id) {
    throw 'updateDataSource, id missing';
  }

  if (!properties || Object.keys(properties).length === 0) {
    throw 'updateDataSource, no properties to update';
  }
  // TODO: line SET d += $properties does not set validRows as an integer. Fix.
  try {
    const result = await session.run(
      `
      MATCH (d:DataSource {
        id: $id
      })
      SET d += $properties
      RETURN { 
        id: d.id,
        fileName: d.fileName,
        filePath: d.filePath,
        importFilePath: d.importFilePath,
        importFileUrl: d.importFileUrl,
        processed: d.processed,
        imported: d.imported,
        cleaned: d.cleaned,
        validRows: d.validRows
      } AS dataSource
      `,
      {
        id,
        properties,
      }
    );

    const updatedDataSource = result.records[0]?.get('dataSource');

    if (!updatedDataSource) {
      throw (
        ('dataSource failed to update in db',
        {
          processedDataSource,
        })
      );
    }

    debug(`updateDataSource updated id: ${id}`);

    debug('<<<<<< End updateDataSource');
    return updatedDataSource;
  } catch (error) {
    throw error;
  }
};

const deleteDataSource = async (session, id) => {
  // console.log('>>>>>> Start updateDataSource');

  if (!id) {
    throw 'deleteDataSource, id missing';
  }

  try {
    const result = await session.run(
      `
      MATCH (d:DataSource {
        id: $id
      })
      DETACH DELETE d

      RETURN count(d) AS count
      `,
      {
        id,
      }
    );

    const count = result.records[0]?.get('count');

    return toNeo4jInteger(count);
  } catch (error) {
    // console.log(error);
    throw error;
  }
};

// TODO: delete dataSource, then make it the first test

export {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
  deleteDataSource,
};
