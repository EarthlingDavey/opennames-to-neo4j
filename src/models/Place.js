import fs from 'fs-extra';
import path from 'path';
import proj4 from 'proj4';
import csv from 'fast-csv';
import csvWriter from 'csv-write-stream';

import { filters } from '../utils/filters.js';

import {
  allowedTYPES,
  allowedLOCAL_TYPES,
  OSGB36,
  WGS84,
  distCsvHeaders,
} from '../utils/defaults.js';

async function processPlaces(dataSource, headers, options) {
  console.log('>>>>>> Start processPlaces');

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

  try {
    csvParseResultPromise = await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv
            .parse({ headers })
            .validate(
              (data) =>
                allowedTYPES.includes(data['TYPE']) &&
                allowedLOCAL_TYPES.includes(data['LOCAL_TYPE'])
            )
        )
        .on('error', (error) => {
          console.error(error);
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
            importFileUrl: importFileUrl ? importFileUrl : null,
          });
          return;
        });
    });
  } catch (error) {
    // Handle rejection here
    console.log(error);
  }

  const csvParseResult = await csvParseResultPromise;

  writer.end();

  if (!csvParseResult) {
    console.error('dataSource failed to process', { dataSource });
  }

  console.log('<<<<<< End processPlaces');

  return csvParseResult;
}

async function processRow(row) {
  const coordinates = proj4(OSGB36, WGS84, {
    x: parseFloat(row.GEOMETRY_X),
    y: parseFloat(row.GEOMETRY_Y),
  });

  const newPlace = {
    id: row.ID,
    name: row.NAME1,
    type: row.LOCAL_TYPE,
    lat: coordinates.y,
    lng: coordinates.x,
  };

  return newPlace;
}

async function importPlaces(session, dataSource, options) {
  console.debug('>>>>>> Start importPlaces');
  console.debug({
    validRows: dataSource.validRows,
  });

  let { importFilePath, importFileUrl } = dataSource;

  const from = importFileUrl ? importFileUrl : `file://${importFilePath}`;

  let statement = `
 
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

  MATCH (d:DataSource {
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

  if (options?.functions?.place?.filterImportStatement) {
    statement = await options?.functions?.place?.filterImportStatement(
      statement,
      dataSource
    );
  }

  statement = await filters(
    { placeImportStatement: statement },
    'placeImportStatement',
    options
  );

  try {
    const result = await session.run(statement, {
      dataSourceId: dataSource.id,
      from,
    });
    const count = result.records[0]?.get('count');

    const importedDataSource = result.records[0]?.get('importedDataSource');

    if (!importedDataSource) {
      console.error('dataSource failed to import', { dataSource });
    }

    console.debug('>>>>>> End importPlaces');

    return importedDataSource;
  } catch (error) {
    console.log(error);
    console.debug('>>>>>> End importPlaces');
    return false;
  }
}

export { processPlaces, importPlaces };
