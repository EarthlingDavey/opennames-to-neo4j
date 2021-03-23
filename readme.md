## What does the package do?

The package is to automate the download and import of OpenNames data to a neo4j database.

### Requirements

You should have a neo4j database.

1. It should share a storage volume with your nodejs application
2. Or, should be able to connect via network to your nodejs application

This is so that it may read csv files for importing.

### Install

Instal with

`npm i opennames-to-neo4j`

or

`yarn add opennames-to-neo4j`

### Use

Import at the start of your .js file.

`import { on2n4j } from 'opennames-to-neo4j';`

To establish a database connection, pass **one** of the following: credentials, driver **or** session to the function.

1. Pass the connection strings as the first argument

```js
const connectionStrings = {
  uri: 'bolt://example.com:7687',
  user: 'neo4j',
  password: 'pass',
};
on2n4j({ strings: connectionStrings }, options);
```

2. Pass an existing instance of a neo4j driver.

```js
import neo4j from 'neo4j-driver';
//...
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
on2n4j({ driver }, options);
```

3. Pass an open neo4j driver session.

```js
const session = driver.session();
//...
await on2n4j({driver}, options);
//...
session.close()l
```

### Options

Here is a commented options object.

```js
const options = {
  /**
   * How many of the OpenName files do you want to process & import?
   * Optional. Leave empty for all files.
   */
  batchSize: 10,

  /**
   * Array of OpenName file names you want to process & import.
   * Optional. Leave empty for all files.
   */
  // includeFiles: ['TR04.csv'],

  /**
   * These custom functions allow for extension of the packages default behaviour.
   * i.e. They can be used to add custom properties to the neo4j imported nodes.
   */
  // functions: customFunctions,

  /**
   * The folder where this app will write processed csv files.
   * If neo4j db is on the same storage volume then use a folder that it can read.
   */
  neo4jImportDir: '/tmp/shared',

  /**
   * If the neo4j connection is remote, and not sharing a storage volume
   * Then you can set the folder to one that is network accessible.
   * e.g. '/app/public'
   * Also include the url endpoint that neo4j will use to reach this folder.
   */
  // neo4jImportUrl: 'http://app:3000/public',

  /**
   * A pause in seconds between each loop.
   * Useful to prevent from relentlessly hogging resources.
   */
  waits: {
    process: 1,
    import: 1,
    clean: 1,
  },
};
```

### Default behaviour

### Extending functionality
