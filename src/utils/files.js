import axios from 'axios';
import fs from 'fs-extra';
import extract from 'extract-zip';
import path from 'path';
import chmodr from 'chmodr';

const downloadFile = async (url, filePath) => {
  await fs.ensureDir(path.dirname(filePath));

  return await axios({
    url: url,
    responseType: 'stream',
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(filePath))
          .on('finish', () => resolve({ response }))
          .on('error', (e) => reject(e));
      })
  );
};

// const getZipVersion = async (productId) => {
//   console.debug('>>>>>> in getZipVersion');

//   try {
//     const dir = await fs.readdir(`/tmp/os/${productId}`);
//     console.log('success!', dir);
//   } catch (err) {
//     console.error(err);
//     return undefined;
//   }
// };

const extractZip = async (zipFilePath, extractTarget) => {
  // console.debug('>>>>>> in extractZip');
  extractTarget = path.resolve(extractTarget);

  await fs.ensureDir(extractTarget);

  try {
    await extract(zipFilePath, { dir: extractTarget });
  } catch (e) {
    // console.error('error extracting zip', { e });
    throw e;
  }
  // console.debug('Extraction complete');

  try {
    await setChmodr(extractTarget);
  } catch (e) {
    throw e;
  }

  return true;
};

const setChmodr = (path) => {
  return new Promise((resolve, reject) => {
    chmodr(path, 0o644, (e) => {
      if (e) {
        reject(e);
      }
      resolve();
    });
  });
};

const getFileContents = async (filePath) => {
  // console.debug('>>>>>> Start getFileContents');
  let data;
  filePath = path.resolve(filePath);

  try {
    data = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    // console.error('error reading file', { e });
    throw e;
  }
  return data;
};

const getCsvFilesArray = async (dir) => {
  // console.debug('>>>>>> in getCsvFilesArray');

  try {
    const allFiles = await fs.readdir(dir);

    if (!allFiles || !allFiles.length) {
      return allFiles;
    }
    return allFiles.filter((filename) => filename.endsWith('.csv'));
  } catch (error) {
    // console.error('error array of files was empty', { error });
    throw error;
  }
};

const deleteFile = async (file) => {
  // console.debug('>>>>>> in deleteFile');

  try {
    const fileExists = await fs.existsSync(file);
    if (!fileExists) return true;
    await fs.unlink(file);
  } catch (error) {
    // console.error(error);
    throw error;
  }

  // console.log('exists and deleted OK');
  return true;
};

const deleteFiles = async (files) => {
  // console.debug('>>>>>> in deleteFiles');

  if (!files || 0 === files.length) {
    throw 'deleteFiles, no files';
  }

  let failed = 0;

  for (const file of files) {
    let didDelete;
    try {
      didDelete = await deleteFile(file);
    } catch (error) {
      // console.error(error);
      throw error;
    }
  }

  return 0 === failed;
};

export {
  downloadFile,
  extractZip,
  getFileContents,
  getCsvFilesArray,
  deleteFile,
  deleteFiles,
};
