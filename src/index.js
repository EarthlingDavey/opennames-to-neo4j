import path from "path";

import { getOsProductVersion, maybeDownloadProduct } from "./os.js ";

import { driver, dbImport } from "./db.js";

import {
  readDataSourceHeaders,
  getDbDataSources,
  dbSaveDataSources,
} from "./models/DataSource.js";

import { processPlaces } from "./models/Place.js";

import { extractZip, getFilesArray } from "./disk.js";

console.log("hello world");

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
    console.error("no dataSources after running getDataSources");
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

  const toProcess = dataSources.filter((x) => !x.processed);

  // console.log(toProcess);

  if (toProcess.length) {
    toProcess.forEach((dataSource) => {
      processPlaces(dataSource, headers, options, productId);
    });
  }

  // console.log(toProcess);
  // console.log(headers);

  // if (extracted) {
  //   await dbImport(session, productId, extractTarget);
  // }

  session.close();

  // console.log({ zipFilePath });

  // const
};

const getDataSources = async (session, productId, options, apiVersion) => {
  console.log(">>>>>> Start getDataSources");

  const dirs = options?.dirs || { neo4jImport: "/app/data" };

  const zipFilePath = await maybeDownloadProduct(productId, apiVersion);

  if (!zipFilePath) {
    console.error("error downloading zip");
    return;
  }

  const extractTarget = `/tmp/os/${productId}/${apiVersion}`;

  const extracted = await extractZip(zipFilePath, extractTarget);

  if (!extracted) {
    console.error("error extracting zip");
    return;
  }

  const dataDir = `${extractTarget}/DATA`;
  const filesArray = await getFilesArray(dataDir);

  if (!filesArray) {
    console.error("error array of files was empty");
    return;
  }

  const headers = await readDataSourceHeaders(extractTarget);

  if (!headers) {
    console.error("error could not read csv headers");
    return;
  }

  // Write some data to the db to say that extraction was completed ok.

  const importFileDir = path.resolve(
    dirs.neo4jImport,
    "os",
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

  console.log("<<<<<< End getDataSources");

  return dbDataSources;
};

main("OpenNames", {
  importBatchSize: 10,
  includeFiles: [
    "NA80.csv",
    //  "SN84.csv"
  ],
  dirs: {
    neo4jImport: "/app/data",
  },
});
