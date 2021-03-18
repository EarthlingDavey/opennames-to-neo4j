async function processPlaces(dataSource, headers) {
  console.log('>>>>>> in processPlaces');

  console.log({ dataSource });
  return;

  const { file, id, version } = dataSource;

  const dataSourceHeaders = await readDataSourceHeaders(version);

  // console.log({ dataSourceHeaders });

  const dirs = getDirs(version);

  // const importFilePath = path.resolve('./data', file);
  const importFilePath = path.resolve(dirs.neo4jImport, file);

  var writer = csvWriter({
    headers: [
      'id',
      'name',
      'slug',
      'type',
      'county',
      'postcodeDistrict',
      'lat',
      'lng',
      'populatedPlaceId',
    ],
  });

  writer.pipe(fs.createWriteStream(importFilePath));

  const csvParsePromise = new Promise((resolve, reject) => {
    fs.createReadStream(path.resolve(dirs.data, file))
      .pipe(
        csv
          .parse({ headers: dataSourceHeaders })
          .validate(
            (data) =>
              allowedTYPES.includes(data['TYPE']) &&
              allowedLOCAL_TYPES.includes(data['LOCAL_TYPE'])
          )
      )
      .on('error', (error) => console.error(error))
      .on('data', async (row) => {
        const processedData = await processRow(row);
        if (processedData) {
          writer.write(processedData);
        }
      })
      .on('end', async () => {
        // console.log(`${id} in readPlaces end `);
        dataSource.processed = version;
        resolve(dataSource);
        return;
      });
  });

  const csvParseResult = await csvParsePromise;

  writer.end();

  return csvParseResult;
}
export { processPlaces };
