import { expect } from 'chai';
import fs from 'fs-extra';

import {
  downloadFile,
  extractZip,
  getFileContents,
  getCsvFilesArray,
  deleteFile,
  deleteFiles,
} from '../src/utils/files.js';

describe('check util/files functions ', () => {
  it('check downloadFile', async () => {
    let downloaded, readContent;
    try {
      downloaded = await downloadFile(
        'https://cdnjs.cloudflare.com/ajax/libs/mocha/8.3.2/mocha.min.js',
        './tmp/for-test/mocha.min.js'
      );
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(downloaded.response.status).equals(200);
      expect(downloaded.finish).to.be.true;
    }

    // Verify the file can be read and has correct content
    try {
      readContent = await getFileContents('./tmp/for-test/mocha.min.js');
    } catch (error) {
      expect(error).to.be.undefined;
      return false;
    } finally {
      const res = readContent.substring(0, 9);
      expect(res).to.equal('!function');
    }
  });

  it('check getFileContents', async () => {
    let readContent;

    try {
      readContent = await getFileContents('./test/assets/test.min.js');
    } catch (error) {
      expect(error).to.be.undefined;
      return false;
    } finally {
      expect(readContent).to.equal('!function(){};');
    }
  });

  it('check getFileContents: error', async () => {
    let readContent;

    try {
      readContent = await getFileContents(
        './test/assets/does-not-exist.min.js'
      );
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(readContent).to.be.undefined;
    }
  });

  it('check extractZip', async () => {
    let extracted, readContent;
    try {
      extracted = await extractZip(
        './test/assets/test_opname_csv_gb.zip',
        './tmp/for-test'
      );
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(extracted).to.be.true;
    }

    // Verify the file has been extracted and can be read
    try {
      readContent = await getFileContents(
        './tmp/for-test/opname_csv_gb/DATA/HP40.csv'
      );
    } catch (error) {
      expect(error).to.be.undefined;
      return false;
    } finally {
      expect(readContent).to.exist;
    }
  });

  it('check extractZip: error', async () => {
    let extracted;
    try {
      extracted = await extractZip(
        './test/assets/does-not-exist.zip',
        './tmp/for-test'
      );
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(extracted).to.be.undefined;
    }
  });

  it('check getCsvFilesArray', async () => {
    let actual;
    const expected = ['HP40.csv', 'HP60.csv'];
    try {
      const dataDir = `./tmp/for-test/opname_csv_gb/DATA`;
      actual = await getCsvFilesArray(dataDir);
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(actual).to.deep.equal(expected);
    }
  });

  it('check getCsvFilesArray: empty directory', async () => {
    let actual;
    const dir = `./test/assets/empty-directory`;
    await fs.ensureDir(dir);

    try {
      actual = await getCsvFilesArray(dir);
    } catch (error) {
      console.log(error);
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(actual).to.deep.equal([]);
    }
  });

  it('check getCsvFilesArray: directory does not exist', async () => {
    let actual;
    const dir = `./test/assets/does-not-exist`;

    try {
      actual = await getCsvFilesArray(dir);
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check deleteFile', async () => {
    let actual;
    const toDelete = `./tmp/for-test/opname_csv_gb/readme.txt`;

    try {
      actual = await deleteFile(toDelete);
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(actual).to.be.true;
    }
  });

  it('check deleteFile: file does not exist', async () => {
    let actual;
    const toDelete = './test/assets/does-not-exist.min.js';

    try {
      actual = await deleteFile(toDelete);
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check deleteFiles', async () => {
    let actual;
    const toDelete = [
      `./tmp/for-test/opname_csv_gb/DATA/HP40.csv`,
      `./tmp/for-test/opname_csv_gb/DATA/HP60.csv`,
    ];

    try {
      actual = await deleteFiles(toDelete);
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(actual).to.be.true;
    }
  });

  it('check deleteFile: empty array', async () => {
    let actual;

    try {
      actual = await deleteFiles([]);
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(actual).to.be.undefined;
    }
  });

  it('check deleteFile: files does not exist', async () => {
    let actual;
    const toDelete = ['./test/assets/does-not-exist.min.js'];

    try {
      actual = await deleteFiles(toDelete);
    } catch (error) {
      expect(error).to.exist;
      return;
    } finally {
      expect(actual).to.be.undefined;
    }
  });
});
