import fs from "fs-extra";
import path from "path";
import proj4 from "proj4";
import csv from "fast-csv";
import csvWriter from "csv-write-stream";

async function processPlaces(dataSource, headers, options, productId) {
  console.log(">>>>>> in processPlaces");

  // console.log({ dataSource });

  const { fileName, filePath, id, version, importFilePath } = dataSource;

  console.log({ fileName, filePath, id, version, importFilePath });

  // return;

  const writer = csvWriter({
    headers: [
      "id",
      "name",
      "slug",
      "type",
      "county",
      "postcodeDistrict",
      "lat",
      "lng",
      "populatedPlaceId",
    ],
  });

  writer.pipe(fs.createWriteStream(importFilePath));

  writer.write({
    id: "test",
    name: "test",
    slug: "test",
    type: "test",
    county: "test",
    postcodeDistrict: "test",
    lat: "test",
    lng: "test",
    populatedPlaceId: "test",
  });

  // TODO: remove
  writer.end();

  return;

  const csvParsePromise = new Promise((resolve, reject) => {
    fs.createReadStream(path.resolve(dirs.data, file))
      .pipe(
        csv
          .parse({ headers: dataSourceHeaders })
          .validate(
            (data) =>
              allowedTYPES.includes(data["TYPE"]) &&
              allowedLOCAL_TYPES.includes(data["LOCAL_TYPE"])
          )
      )
      .on("error", (error) => console.error(error))
      .on("data", async (row) => {
        const processedData = await processRow(row);
        if (processedData) {
          writer.write(processedData);
        }
      })
      .on("end", async () => {
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
