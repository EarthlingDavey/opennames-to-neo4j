import fs from 'fs-extra';
import path from 'path';
import proj4 from 'proj4';
import csvWriter from 'csv-write-stream';

import csv from '@fast-csv/parse';

import { filters } from '../utils/filters.js';

import {
  allowedTYPES,
  allowedLOCAL_TYPES,
  OSGB36,
  WGS84,
  distCsvHeaders,
} from '../utils/defaults.js';

async function processPlaces(dataSource, headers, options) {
  /* debug has unit tests */
  /* c8 ignore next 1 */
  const debug = options?.functions?.debug || (() => null);
  debug('>>>>>> Start processPlaces');

  // console.log({ dataSource, headers, options });

  const { filePath } = dataSource;

  const importFilePath = path.resolve(
    options.neo4jImportDir,
    'os',
    'OpenNames',
    dataSource.version,
    dataSource.fileName
  );

  const importFileUrl = options.neo4jImportUrl
    ? `${options.neo4jImportUrl}/os/OpenNames/${dataSource.version}/${dataSource.fileName}`
    : null;

  const writerHeaders = await filters(
    { distCsvHeaders: [...distCsvHeaders] },
    'distCsvHeaders',
    options
  );

  const writer = csvWriter({
    headers: writerHeaders,
  });

  await fs.ensureFile(importFilePath);

  writer.pipe(fs.createWriteStream(importFilePath));

  let csvParseResultPromise,
    validRows = 0,
    writePromises = [];

  const validateRow = async (data) => {
    // TODO: Here check ID, NAME etc. exist
    const rowIsValid = 'Postcode' === data['LOCAL_TYPE'];

    const rowIsValidFiltered = await filters(
      { rowIsValid, data },
      'rowIsValid',
      options
    );

    return rowIsValidFiltered;
  };

  try {
    csvParseResultPromise = await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .on('error', (error) => {
          // In-case file doesn't exist
          reject(error);
        })
        .pipe(
          csv.parse({ headers }).validate((data, cb) => {
            setImmediate(async () => cb(null, await validateRow(data)));
          })
        )
        .on('error', (error) => {
          // console.error(error);
          reject(error);
        })
        .on('data', async (row) => {
          validRows++;
          let processedRow = await processRow(row);

          processedRow = await filters(
            { processedRow, row },
            'processedRow',
            options
          );

          if (processedRow) {
            writePromises.push(await writer.write(processedRow));
          }
        })
        .on('end', async () => {
          await Promise.all(writePromises);
          resolve({
            ...dataSource,
            processed: true,
            validRows: validRows,
            importFilePath: importFilePath,
            importFileUrl: importFileUrl,
          });
          return;
        });
    });
  } catch (error) {
    // Handle rejection here
    // console.log(error);
    throw error;
  }

  const csvParseResult = await csvParseResultPromise;

  writer.end();

  /**
   * This is a fallback clause to throw an error in-case where
   * csvParseResult is not a valid result AND an error was not thrown earlier.
   */
  /* c8 ignore next 3 */
  if (!csvParseResult) {
    throw ('dataSource failed to process', { dataSource });
  }
  debug(`validRows: ${validRows}`);
  debug(`processed file importFilePath: ${csvParseResult.importFilePath}`);

  if (csvParseResult.importFileUrl)
    debug(`processed file importFileUrl: ${csvParseResult.importFileUrl}`);

  debug('<<<<<< End processPlaces');
  return csvParseResult;
}

async function processRow(row) {
  let coordinates;

  try {
    coordinates = proj4(OSGB36, WGS84, {
      x: parseFloat(row.GEOMETRY_X),
      y: parseFloat(row.GEOMETRY_Y),
    });
    if (
      typeof coordinates.x !== 'number' ||
      typeof coordinates.y !== 'number' ||
      isNaN(coordinates.x) ||
      isNaN(coordinates.y)
    ) {
      throw 'coordinate is not a number';
    }
  } catch (error) {
    throw error;
  }

  const newPlace = {
    id: row.ID,
    name: row.NAME1,
    type: row.LOCAL_TYPE,
    lat: coordinates.y,
    lng: coordinates.x,
  };

  return newPlace;
}

let importStatement = `
 
  USING PERIODIC COMMIT 500
  
  LOAD CSV WITH HEADERS FROM $from AS place
  WITH place 
  
  MERGE (p:Place {
    id: place.id
  })
  
  SET 
  // PLACE PROPERTIES
  p.name             = place.name,
  p.type             = place.type,
  p.location         = point({latitude: tofloat(place.lat), longitude: tofloat(place.lng), crs: 'WGS-84'}),
  p.updatedAt        = TIMESTAMP()
  
  // This collect will close the UNWIND 'loop'
  WITH count(p) as count, $dataSourceId AS dataSourceId 

  MERGE (d:DataSource {
    id: dataSourceId
  })
  SET d.imported = true

  RETURN 
  count AS count, 
  { id: d.id,
    fileName: d.fileName,
    filePath: d.filePath,
    importFilePath: d.importFilePath,
    processed: d.processed,
    imported: d.imported,
    cleaned: d.cleaned
  } AS importedDataSource
  `;

async function importPlaces(session, dataSource, options) {
  /* debug has unit tests */
  /* c8 ignore next 1 */
  const debug = options?.functions?.debug || (() => null);
  debug('>>>>>> Start importPlaces');
  debug(`importing rows: ${dataSource.validRows}`);

  let { importFilePath, importFileUrl } = dataSource;

  if (!importFilePath && !importFileUrl) {
    throw 'importPlaces, missing importFilePath or importFileUrl';
  }

  const from = importFileUrl ? importFileUrl : `file://${importFilePath}`;

  importStatement = await filters(
    { placeImportStatement: importStatement },
    'placeImportStatement',
    options
  );

  // console.log(importStatement);
  // console.log(dataSource.id);
  // console.log(from);

  try {
    const result = await session.run(importStatement, {
      dataSourceId: dataSource.id,
      from,
    });
    // const count = result.records[0]?.get('count');

    const importedDataSource = result.records[0]?.get('importedDataSource');

    // console.log({ importedDataSource });
    // console.log({ count });

    if (true === importedDataSource?.imported) {
      debug(`imported ok: ${importedDataSource.fileName}`);
    }

    debug('<<<<<< End importPlaces');
    return importedDataSource;
  } catch (error) {
    throw error;
  }
}

export { processPlaces, processRow, importPlaces, importStatement };
