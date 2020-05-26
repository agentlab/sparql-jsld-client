import fs from 'fs';

// emulate create-react-app behaviour witn .env files
if (fs.existsSync('.env.test.local')) {
  require('custom-env').env('test.local');
} else if (fs.existsSync('.env.test')) {
  require('custom-env').env('test');
}

/**
 * Sparql Endpoint URL (адрес веб-сервиса)
 */
export const rdfServerUrl = process.env.REACT_APP_SERVER_RDF_URL || 'http://localhost:8181/rdf4j-server';
export const rmRepositoryParam = JSON.parse(process.env.REACT_APP_RM_REPOSITORY_PARAM || '{}');
export const rmRepositoryType = process.env.REACT_APP_RM_REPOSITORY_TYPE || 'native-rdfs';
