import fs from 'fs-extra';
import extract from 'extract-zip';

const getZipVersion = async (productId) => {
  console.debug('>>>>>> in getZipVersion');

  try {
    const dir = await fs.readdir(`/tmp/os/${productId}`);
    console.log('success!', dir);
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

const extractZip = async (zipFilePath, extractTarget) => {
  console.debug('>>>>>> in extractZip');
  console.log(extractTarget);
  return true;
  try {
    await extract(zipFilePath, { dir: extractTarget });
    console.log('Extraction complete');
    return true;
  } catch (err) {
    // handle any errors
    console.error({ err });
    return false;
  }
};

const getFilesArray = async (dir) => {
  console.debug('>>>>>> in getFilesArray');

  // const dirs = getDirs(version);

  try {
    const allFiles = await fs.readdir(dir);
    // console.log('success!', allFiles);
    if (!allFiles || !allFiles.length) {
      return false;
    }
    return allFiles.filter((filename) => filename.endsWith('.csv'));
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

export { getZipVersion, extractZip, getFilesArray };
