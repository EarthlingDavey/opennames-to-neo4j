import fs from 'fs-extra';
import csv from '@fast-csv/parse';

const readDataSourceHeaders = async (dir) => {
  console.log('>>>>>> Start readDataSourceHeaders');
  const filePath = `${dir}/DOC/OS_Open_Names_Header.csv`;
  try {
    const headers = await new Promise((resolve, reject) => {
      let headers = [];
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: false }))
        .on('error', (error) => console.error(error))
        .on('data', (row) => (headers = row))
        .on('end', () => resolve(headers));
    });
    return headers;
  } catch (error) {
    console.error('error could not read csv headers', error);
    return false;
  }
};

const getDbDataSources = async (session, version, options) => {
  console.log('>>>>>> Start getDbDataSources');
  console.log({ version, options });
  console.log(options.includeFiles);

  const query = `
      MATCH (product:OsProduct {
        id: $productId
      })-[:HAS_VERSION]->(v:OsVersion {
        id: $version
      })-[:HAS_FILE]->(d:DataSource)

      ${
        options.includeFiles && options.includeFiles.length
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
          ${options.batchSize ? `[0..$options.batchSize]` : ``}
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
    console.log(error);
    return false;
  }
};

const dbSaveDataSources = async (
  session,
  version,
  dataDir,
  filesArray,
  headers,
  options
) => {
  console.log('>>>>>> Start dbSaveDataSources');

  console.log(options);

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
          ${options.batchSize ? `[0..$options.batchSize]` : ``}
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
        options,
      }
    );

    console.log('<<<<<< End dbSaveDataSources');

    return {
      dataSources: result.records[0]?.get('dataSource'),
      headers: result.records[0]?.get('headers'),
    };
  } catch (error) {
    console.log(error);
    return false;
  }
};

const updateDataSource = async (session, processedDataSource) => {
  console.log('>>>>>> Start updateDataSource');

  const { id, ...properties } = processedDataSource;

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
      console.error('dataSource failed to update in db', {
        processedDataSource,
      });
    }

    return updatedDataSource;
  } catch (error) {
    console.log(error);
    return false;
  }

  return;
};

export {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
  updateDataSource,
};
