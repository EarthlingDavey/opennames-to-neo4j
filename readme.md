Warning - this is an early release. Exercise caution 😅  
And, please feedback at [the Neo4j discord server](https://discord.gg/neo4j) in #app-dev or via GitHub [issues tab](https://github.com/EarthlingDavey/opennames-to-neo4j/issues).

## Background

<details>
  <summary>OS Open Names</summary>
   
  > A comprehensive dataset of place names, roads numbers and postcodes for Great Britain.  
  > <cite>[Ordnance Survey](https://www.ordnancesurvey.co.uk/business-government) > [Products](https://www.ordnancesurvey.co.uk/business-government/products) > [Open Names](https://www.ordnancesurvey.co.uk/business-government/products/open-map-names)</cit>

Relevant details about the data:

- Public API with downloads in **CSV**, GML, API and Geopackage formats.
- Update frequency Quarterly - January, April, July and October
- Location coordinates supplied in [OSGB36](https://en.wikipedia.org/wiki/Ordnance_Survey_National_Grid) grid digits.
- Free licence with attribution statement - [OGL licence ](https://www.ordnancesurvey.co.uk/business-government/products/open-map-names#licensing)

</details>

<details>
  <summary>Motivation, why does this package exist?</summary>
  
I'm currently developing an online service for UK users. And, it uses neo4j for the database.

The website needs an input field with autocomplete so users can enter their postcode or town/city. The lookup should return latitude & longitude coordinates - they're used for distance calculations.

Having data in a database under my own control has advantages over alternatives.

- No reliance on a third party e.g. Google Maps
- No rate limits or additional monthly SaaS subscription.
- Save leaking user details to third party services.
- Efficient and quicker lookups.
- neo4j can use the imported Places for queries.

I found that the whole process of moving data from Open Names to neo4j was a considerable undertaking. So I wrote this package to separate the concern from the main app to this standalone package.

</details>

## What does the package do?

It automates the download and import of Open Names data to a neo4j database. It will:

1. Check for new versions
1. Download OpenNames .zip file
1. Extract
1. Create DataSource nodes for each extracted .csv file.
1. Process source .csv files.
1. Validate - allows for custom validation of each row.
1. Transform data  
   By default, converts OS northing and easting values to standard lat, lng co-ordinates.  
   Allows for custom data transforms.
1. Processed data is written to /tmp .csv files.
1. Imported to neo4j via file or network.
1. Clean up /tmp files as it goes.

### Function visual overview

![Visual overview of opennames-to-neo4j](https://github.com/EarthlingDavey/opennames-to-neo4j/blob/develop/docs/flow.png?raw=true)

Created with [whimsical.com](https://whimsical.com).

### Graph Model

![Graph model of opennames-to-neo4j](https://raw.githubusercontent.com/EarthlingDavey/opennames-to-neo4j/develop/docs/arrows-app/opennames-to-neo4j-model.svg)

Created with [arrows.app](https://arrows.app). Source at [opennames-to-neo4j-model.json](/docs/arrows-app/opennames-to-neo4j-model.json)

## Requirements

1. Have at least 2GB available disk space.
1. Be able to write to the a directory.
1. Have a neo4j database.  
   So that it may read csv files for importing, it should:

   - Either, share a storage volume with your nodejs application
   - Or, be able to connect via network to your nodejs application

## Install

Instal with

`npm i opennames-to-neo4j` or `yarn add opennames-to-neo4j`

## Use

Import at the start of your .js file.

`import on2n4j from 'opennames-to-neo4j';`

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
await on2n4j({ driver }, options);
//...
session.close();
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
   * In case this app is running locally, and your database is remote.
   * e.g. https://sandbox.neo4j.com/
   * Then set neo4jImportDir to '/app/public' & useNgrok to true.
   * ngrok will create a tunnel so neo4j can reach this local app's server.
   */
  // neo4jImportDir: '/app/public',
  // useNgrok: true,

  /**
   * A pause in seconds between each loop.
   * Useful to prevent from relentlessly hogging resources.
   */
  waits: {
    process: 1,
    import: 1,
    clean: 1,
  },

  /**
   * Add your own debugger here.
   */
  // debug: (message) => {
  //   console.debug(message);
  // },
};
```

## Default behaviour

The default behaviour of this package is to

- Import places of type Postcode from the OpenNames .csv
- Log all debug messages to the terminal

## Extending functionality

### Extend with Filters

To extend the some functions of the package, filters are used.
These are somewhat like how WordPress uses filters.

> They provide a way for functions to modify data of other functions.

Take a look at [examples/with-docker-neo4j/app/src/customFunctions.js](examples/with-docker-neo4j/app/src/customFunctions.js) an example of how the filter functions are defined.

The example filters are commented, in essence it allows for

1. Custom validation on each row of the OpenNames source .csv files.

   e.g. process and import places with type Hamlet to your database

1. Add custom properties (with optional transform) to Place nodes.

   1. `distCsvHeadersFilter` to add header rows to your processed .csv files.
   1. `processedRowFilter` to read the source row, and add a property to the processed row.
   1. `placeImportStatementFilter` to edit the cypher query for .csv import.

The filters might look complex, but, I hope they are a good balance between complexity & functionality. And enable this plugin to be flexible enough for a variety of use cases.

For reference, to find where the filters are called, do a find for `filters(` in `./src` directory.

### Extend with Functions

By default there is a debug function that logs all messages to the terminal.

If you have a custom logging solution or, would prefer to silence the debug messages,
then pass function as a debug property of the `options.functions`.

```js
const options = {
  functions: {
    debug: logger,
    // debug: () => null,
  },
};
```

---

## Examples

### Minimal

- Minimal configuration
- Uses remote neo4j database
- Only needs neo4j credentials, to start populating the database with OpenName places
- Starts an express server to host .csv files
- Uses ngrok tunnel to allow database to access files

To start the minimal example

- Copy `.env.sample` to `.env` and complete with your login credentials.

  A [neo4j sandbox](https://neo4j.com/sandbox/) database is good for local development.

- Next run `npm i` and `npm run dev:start`.

The example project, and package source files are being watched.

Check the console messages for errors or debug info.

#### Run minimal example in Docker

Known issue: Permission errors on macOS host on `.zip` extracted `.csv` files.

Workaround: run in a linux docker container.

- Install docker and docker-compose

- From `examples/minimal` run `docker-compose up`

### With Docker Neo4j

- Uses a local neo4j database
- Database shares a storage volume with the example app
- Uses custom functions to extend default functionality, adds 'County' property to Place nodes
- A GraphQL server is started, so that you can explore imported Open Name places

To start this project

- Copy `.env.sample` to `.env` and complete with your login credentials.

- Run `docker-compose up`

---

## Package development

### Writing code

To write code for the package, it is probably easiest to use `example/minimal`, or make a copy of it.

### Testing

To test, go to `/test`.

- Copy `.env.sample` to `.env` and complete with your login credentials.

  A [neo4j sandbox](https://neo4j.com/sandbox/) database is good for testing.

- Next run `npm i` and `npm run coverage` to run all rests and show a coverage report.

#### Testing in Docker

Known issue: Permission errors on macOS host on `.zip` extracted `.csv` files.

Workaround: run in a linux docker container.

- Install docker and docker-compose

- Run `docker-compose up -d`

- You can now ues the earlier mentioned `npm` commands, just with a `docker-compose exec dev` prefix.

  Like: `docker-compose exec dev npm i` & `docker-compose exec dev npm run coverage`

---

### Pull requests

Please let me know if you intend to work and create a pull request on this repository.

Otherwise, please understand, I will only merge pull requests at my discretion.

### Issues

Tag me (@davey) in [the Neo4j discord server!](https://discord.gg/neo4j) in #app-dev

Or, create an issue via GitHub [issues tab](https://github.com/EarthlingDavey/opennames-to-neo4j/issues).
