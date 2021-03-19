import fs from 'fs-extra';
import path from 'path';
import proj4 from 'proj4';
import csv from 'fast-csv';
import csvWriter from 'csv-write-stream';

import {
  allowedTYPES,
  allowedLOCAL_TYPES,
  OSGB36,
  WGS84,
  distCsvHeaders,
} from '../utils/defaults.js';

async function processPlaces(dataSource, headers, options, productId) {
  console.log('>>>>>> Start processPlaces');

  const { fileName, filePath, id, version, importFilePath } = dataSource;

  const writer = csvWriter({
    headers: distCsvHeaders,
  });

  await fs.ensureFile(importFilePath);

  writer.pipe(fs.createWriteStream(importFilePath));

  let csvParseResultPromise;

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
          const processedData = await processRow(row);
          if (processedData) {
            writer.write(processedData);
          }
        })
        .on('end', async () => {
          dataSource.processed = true;
          resolve(dataSource);
          return;
        });
    });
  } catch (error) {
    // Handle rejection here
    console.log(error);
  }

  writer.end();

  const csvParseResult = await csvParseResultPromise;

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

export { processPlaces };
