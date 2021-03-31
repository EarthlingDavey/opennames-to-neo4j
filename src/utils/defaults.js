import { styledDebug } from './utils.js';

const defaultOptions = {
  batchSize: 10,
  neo4jImportDir: '/tmp/import',
  waits: {
    process: 1,
    import: 1,
    clean: 1,
  },
  functions: {
    debug: styledDebug,
  },
};

const allowedTYPES = ['populatedPlace', 'other'];
const allowedLOCAL_TYPES = ['Postcode'];

const OSGB36 = `+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs`;
const WGS84 = `+proj=longlat +ellps=WGS84 +towgs84=0,0,0 +no_defs`;

const distCsvHeaders = ['id', 'name', 'type', 'lat', 'lng'];

export {
  defaultOptions,
  allowedTYPES,
  allowedLOCAL_TYPES,
  OSGB36,
  WGS84,
  distCsvHeaders,
};
