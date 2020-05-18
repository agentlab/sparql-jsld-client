import { FileUploadConfig } from '../src/SparqlClient';
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
export const rmRepositoryID = process.env.REACT_APP_RDFREP_RM || 'reqs2';
export const apiUrl = `${rdfServerUrl}/repositories/${process.env.REACT_APP_RDFREP_RM || 'reqs2'}`;

export const queryPrefixes: { [s: string]: string } = {
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  dcterms: 'http://purl.org/dc/terms/',
  //dc: 'http://purl.org/dc/elements/1.1/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  schema: 'http://schema.org/',
  oslc: 'http://open-services.net/ns/core#',
  //oslc_rm: 'http://open-services.net/ns/rm#',
  // eslint-disable-next-line @typescript-eslint/camelcase
  oslc_asset: 'http://open-services.net/ns/asset#',
  sh: 'http://www.w3.org/ns/shacl#',

  acl: 'http://www.w3.org/ns/auth/acl#',
  ppo: 'http://vocab.deri.ie/ppo#',
  pporoles: 'https://agentlab.ru/onto/ppo-roles#',
  policies: 'http://cpgu.kbpm.ru/ns/rm/policies#',

  nav: 'http://cpgu.kbpm.ru/ns/rm/navigation#',
  rm: 'http://cpgu.kbpm.ru/ns/rm/rdf#',
  rmUserTypes: 'http://cpgu.kbpm.ru/ns/rm/user-types#',
  cpgu: 'http://cpgu.kbpm.ru/ns/rm/cpgu#',

  users: 'http://cpgu.kbpm.ru/ns/rm/users#',
  projects: 'http://cpgu.kbpm.ru/ns/rm/projects#',
  folders: 'http://cpgu.kbpm.ru/ns/rm/folders#',
  reqs: 'http://cpgu.kbpm.ru/ns/rm/reqs#',
};

export const rootFolder = '../rdf-data-expert/';

export const vocabsFiles: FileUploadConfig[] = [
  {
    file: 'vocabs/xsd.ttl',
    baseURI: '<http://www.w3.org/2001/XMLSchema#>',
  },
  {
    file: 'vocabs/xsd-ru.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/xsd#>',
  },
  {
    file: 'vocabs/shacl.ttl',
    baseURI: '<http://www.w3.org/ns/shacl#>',
  },
  {
    file: 'vocabs/navigation.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/navigation#>',
  },
  {
    file: 'vocabs/rm.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/rdf#>',
  },
  {
    file: 'vocabs/rm-user-types.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/user-types#>',
  },
  {
    file: 'vocabs/cpgu.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/cpgu#>',
  },
  {
    file: 'vocabs/acl.ttl',
    baseURI: '<http://www.w3.org/ns/auth/acl#>',
  },
  {
    file: 'vocabs/ppo.ttl',
    baseURI: '<http://vocab.deri.ie/ppo#>',
  },
  {
    file: 'vocabs/ppo-roles.ttl',
    baseURI: '<https://agentlab.ru/onto/ppo-roles#>',
  },
];

export const shapesFiles: FileUploadConfig[] = [
  {
    file: 'shapes/shacl/shacl-shacl.ttl',
    baseURI: '<http://www.w3.org/ns/shacl-shacl#>',
  },
  {
    file: 'shapes/shacl/xsd-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/xsd-shapes#>',
  },
  {
    file: 'shapes/shacl/rm/rm-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/rdf#>',
  },
  {
    file: 'shapes/shacl/cpgu/cpgu-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/cpgu#>',
  },
];

export const usersFiles: FileUploadConfig[] = [
  {
    file: 'data/users.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/users#>',
  },
  {
    file: 'data/access-management.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/policies#>',
  },
];

export const projectsFoldersFiles: FileUploadConfig[] = [
  {
    file: 'data/projects.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/projects#>',
  },

  {
    file: 'data/folders.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/folders#>',
  },
];

export const samplesFiles: FileUploadConfig[] = [
  {
    file: 'data/cpgu/sample.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/reqs#>',
  },
  {
    file: 'data/cpgu/sample-collection.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/reqs#>',
  },
];
