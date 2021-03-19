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
  // return true;
  try {
    await extract(zipFilePath, { dir: extractTarget });
    console.log('Extraction complete');
    return true;
  } catch (error) {
    // handle any errors
    console.error('error extracting zip', { error });
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
  } catch (error) {
    console.error('error array of files was empty', { error });
    return undefined;
  }
};

const deleteFile = async (file) => {
  console.debug('>>>>>> in deleteFile');

  try {
    const fileExists = await fs.existsSync(file);
    if (!fileExists) return false;

    const delResult = await fs.unlink(file);
  } catch (error) {
    console.error(error);
    return false;
  }

  console.log('exists and deleted OK');
  return true;
};

const deleteFiles = async (files) => {
  console.debug('>>>>>> in deleteFiles');

  let failed = 0;

  for (const file of files) {
    if (!file) continue;
    const didDelete = await deleteFile(file);
    if (!didDelete) {
      failed++;
    }
  }

  const deleteSuccess = 0 === failed;

  if (!deleteSuccess) {
    console.error('clean up failed to delete files for dataSource', {
      files,
    });
  }

  return deleteSuccess;
};

export { getZipVersion, extractZip, getFilesArray, deleteFiles };
