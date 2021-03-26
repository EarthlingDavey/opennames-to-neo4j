import { expect } from 'chai';

import {
  downloadFile,
  extractZip,
  getFileContents,
  getFilesArray,
  deleteFile,
  deleteFiles,
} from '../src/utils/files.js';

describe.only('check util/files functions ', () => {
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

  it('check extractZip', async () => {
    let extracted, readContent;
    try {
      extracted = await extractZip(
        './test/test_opname_csv_gb.zip',
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

  it('check getFilesArray', async () => {
    let actual;
    const expected = ['HP40.csv', 'HP60.csv'];
    try {
      const dataDir = `./tmp/for-test/opname_csv_gb/DATA`;
      actual = await getFilesArray(dataDir);
    } catch (error) {
      expect(error).to.be.undefined;
      return;
    } finally {
      expect(actual).to.deep.equal(expected);
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
});
