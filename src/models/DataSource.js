import fs from 'fs-extra';
import csv from 'fast-csv';

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
    console.log(error);
    return false;
  }
};

const getDbDataSources = async (session, productId, version) => {
  console.log('>>>>>> Start getDbDataSources');
  console.log({ productId, version });

  try {
    const result = await session.run(
      `
      MATCH (product:OsProduct {
        id: $productId
      })-[:HAS_VERSION]->(v:OsVersion {
        id: $version
      })-[:HAS_FILE]->(d:DataSource)

      RETURN COLLECT({ 
        id: d.id,
        fileName: d.fileName,
        filePath: d.filePath,
        importFilePath: d.importFilePath,
        processed: d.processed,
        imported: d.imported,
        cleaned: d.cleaned,
        version: v.id
      }) AS dataSource, v.headers AS headers
      `,
      {
        productId,
        version,
      }
    );
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
  productId,
  version,
  dataDir,
  filesArray,
  headers,
  importFileDir
) => {
  console.log('>>>>>> Start dbSaveDataSources');

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
      $version AS version,
      $importFileDir AS importFileDir

      UNWIND filesArray as fileName

      MERGE (d:DataSource {
        id: version + "/" + fileName
      })
      ON CREATE SET
      d.createdAt = TIMESTAMP()
      SET
      d.fileName = fileName,
      d.filePath = dataDir + "/" + fileName,
      d.importFilePath = importFileDir + "/" + fileName,
      d.updatedAt = TIMESTAMP()

      MERGE (v)-[:HAS_FILE]->(d)

      RETURN COLLECT({ 
        id: d.id,
        fileName: d.fileName,
        filePath: d.filePath,
        importFilePath: d.importFilePath,
        processed: d.processed,
        imported: d.imported,
        cleaned: d.cleaned,
        version: v.id
      }) AS dataSource, product AS product, v.headers AS headers
      `,
      {
        productId,
        version,
        dataDir,
        filesArray,
        headers,
        importFileDir,
      }
    );

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

    return result.records[0]?.get('dataSource');
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
