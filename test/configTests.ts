/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { JsStrObj } from '../src/ObjectProvider';
import { FileUploadConfig } from '../src/SparqlClient';

export const testNs: JsStrObj = {
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  sesame: 'http://www.openrdf.org/schema/sesame#',
  
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
    file: 'vocabs/rdf.ttl',
    baseURI: '<http://www.w3.org/1999/02/22-rdf-syntax-ns#>',
  },
  {
    file: 'vocabs/rdfs.ttl',
    baseURI: '<http://www.w3.org/2000/01/rdf-schema#>',
  },
  {
    file: 'vocabs/xsd.ttl',
    baseURI: '<http://www.w3.org/2001/XMLSchema#>',
  },
  {
    file: 'vocabs/xsd-ru.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/xsd#>',
  },
  // deadlocks rdfs+dt
  //{
  //  file: 'vocabs/shacl.ttl',
  //  baseURI: '<http://www.w3.org/ns/shacl#>',
  //},
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
    file: 'shapes/shacl/ppo-roles-shapes.ttl',
    baseURI: '<https://agentlab.ru/onto/ppo-roles#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  // deadlocks rdfs+dt
  //{
  //  file: 'shapes/shacl/shacl-shacl.ttl',
  //  baseURI: '<http://www.w3.org/ns/shacl-shacl#>',
  //  graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  //},
  {
    file: 'shapes/shacl/xsd-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/xsd-shapes#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/shacl/rm/rm-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/rdf#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/shacl/rm/rm-user-types-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/user-types#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/shacl/cpgu/cpgu-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/cpgu#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
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
    file: 'data/cpgu/sample-module.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/reqs#>',
  },
  {
    file: 'data/cpgu/sample-collection.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/reqs#>',
  },
];
