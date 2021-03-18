import fs from 'fs-extra';
import csv from 'fast-csv';

const readDataSourceHeaders = async (dir) => {
  console.log('>>>>>> Start readDataSourceHeaders');

  // console.log(`${dir}/DOC/OS_Open_Names_Header.csv`);

  // const headers = await fs.createReadStream(
  //   `${dir}/DOC/OS_Open_Names_Header.csv`
  // );

  const filePath = `${dir}/DOC/OS_Open_Names_Header.csv`;
  // console.log({ headers });
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
        file: d.file,
        path: d.path,
        processed: d.processed,
        imported: d.imported,
        cleaned: d.cleaned
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
  headers
) => {
  console.log('>>>>>> Start dbSaveDataSources');
  // console.log({ productId, version, dataDir, filesArray });
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

      UNWIND filesArray as filesName

      MERGE (d:DataSource {
        id: version + "/" + filesName
      })
      ON CREATE SET
      d.createdAt = TIMESTAMP()
      SET
      d.file = filesName,
      d.path = dataDir + "/" + filesName,
      d.updatedAt = TIMESTAMP()

      MERGE (v)-[:HAS_FILE]->(d)

      RETURN COLLECT({ 
        id: d.id,
        file: d.file,
        path: d.path,
        processed: d.processed,
        imported: d.imported,
        cleaned: d.cleaned
      }) AS dataSource, product AS product, v.headers AS headers
      `,
      {
        productId,
        version,
        dataDir: dataDir,
        filesArray,
        headers,
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

export { readDataSourceHeaders, getDbDataSources, dbSaveDataSources };
