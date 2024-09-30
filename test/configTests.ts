/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { rootModelInitialState } from '../src';
import { JsStrObj } from '../src/ObjectProvider';
import { FileUploadConfig } from '../src/SparqlClient';

export const testNs: JsStrObj = {
  ...rootModelInitialState.ns.current,

  dcterms: 'http://purl.org/dc/terms/',
  //dc: 'http://purl.org/dc/elements/1.1/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  schema: 'http://schema.org/',
  oslc: 'http://open-services.net/ns/core#',
  //oslc_rm: 'http://open-services.net/ns/rm#',
  oslc_asset: 'http://open-services.net/ns/asset#',

  //acl: 'http://www.w3.org/ns/auth/acl#',
  ppo: 'http://vocab.deri.ie/ppo#',
  pporoles: 'https://agentlab.eu/ns/rm/ppo-roles#',
  //policies: 'https://agentlab.eu/ns/rm/policies#',

  nav: 'https://agentlab.eu/ns/rm/navigation#',
  rm: 'https://agentlab.eu/ns/rm/rdf#',
  rmUserTypes: 'https://agentlab.eu/ns/rm/user-types#',
  clss: 'https://agentlab.eu/ns/rm/classifier#',

  users: 'https://agentlab.eu/ns/rm/users#',
  projects: 'https://agentlab.eu/ns/rm/projects#',
  folders: 'https://agentlab.eu/ns/rm/folders#',
  reqs: 'https://agentlab.eu/ns/rm/reqs#',

  iot: 'https://agentlab.eu/ns/iot#',
};

export const rootFolder = './test-data/';

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
  // deadlocks rdfs+dt
  //{
  //  file: 'vocabs/shacl.ttl',
  //  baseURI: '<http://www.w3.org/ns/shacl#>',
  //},
  {
    file: 'vocabs/navigation.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/navigation#>',
  },
  {
    file: 'vocabs/rm.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/rdf#>',
  },
  {
    file: 'vocabs/rm-user-types.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/user-types#>',
  },
  {
    file: 'vocabs/classifier.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/classifier#>',
  },
  /*{
    file: 'vocabs/acl.ttl',
    baseURI: '<http://www.w3.org/ns/auth/acl#>',
  },*/
  {
    file: 'vocabs/ppo.ttl',
    baseURI: '<http://vocab.deri.ie/ppo#>',
  },
  {
    file: 'vocabs/ppo-roles.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/ppo-roles#>',
  },
];

export const shapesFiles: FileUploadConfig[] = [
  {
    file: 'shapes/ppo-roles-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/ppo-roles#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  // deadlocks rdfs+dt
  //{
  //  file: 'shapes/shacl-shacl.ttl',
  //  baseURI: '<http://www.w3.org/ns/shacl-shacl#>',
  //  graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  //},
  {
    file: 'shapes/xsd-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/xsd#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/rm-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/rdf#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/rm-user-types-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/user-types#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
  {
    file: 'shapes/classifier-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/classifier#>',
    graph: '<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>',
  },
];

export const usersFiles: FileUploadConfig[] = [
  {
    file: 'data/users.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/users#>',
  },
  /*{
    file: 'data/access-management.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/policies#>',
  },*/
];

export const projectsFoldersFiles: FileUploadConfig[] = [
  {
    file: 'data/projects.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/projects#>',
  },
  {
    file: 'data/folders.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/folders#>',
  },
];

export const samplesFiles: FileUploadConfig[] = [
  {
    file: 'data/sample-module.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/reqs#>',
  },
  {
    file: 'data/sample-collection.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/reqs#>',
  },
];
