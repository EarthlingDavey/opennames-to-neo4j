import { assert } from 'chai'; // Using Assert style
import { expect } from 'chai'; // Using Expect style
import { should } from 'chai'; // Using Should style
console.log('>>>>>> Start tests');

describe('check x ', () => {
  it('check input is provided or not', () => {
    expect('a').to.equals('a');
  });
});
