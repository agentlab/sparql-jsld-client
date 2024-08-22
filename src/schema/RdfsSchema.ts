/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/

export const NopSchema: any /*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/rdf#NopSchema',
  '@id': 'rm:NopSchema', // json-ld
  '@type': 'sh:NodeShape', // json-ld
  targetClass: 'rdfs:Nop',
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
  },
  required: ['@id'],
};

export const ResourceSchema: any /*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/rdf#ResourceSchema',
  '@id': 'rm:ResourceSchema', // json-ld
  '@type': 'sh:NodeShape', // json-ld
  title: 'Resource Schema',
  description: 'Schema of RDF Resource',
  targetClass: 'rdfs:Resource',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    label: 'rdfs:label',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Class',
      type: 'string',
      format: 'iri',
    },
    label: {
      title: 'Label',
      type: 'string',
    },
  },
  required: ['@id'],
};

export const ClassSchema: any /*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/rdf#Class',
  '@id': 'rm:Class', // json-ld
  '@type': 'sh:NodeShape', // json-ld
  title: 'Class Schema',
  description: 'Schema of RDFS Class',
  targetClass: 'rdfs:Class',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Class',
      type: 'string',
      format: 'iri',
    },
    //label: {
    //  '@id': 'rdfs:label',
    //  title: 'Label',
    //  type: 'string',
    //},
    //subClassOf: {
    //  '@id': 'rdfs:subClassOf',
    //  title: 'Subclass of a Class',
    //  type: 'array',
    //  items: {
    //    type: 'string',
    //    format: 'iri',
    //  },
    //},
  },
  required: ['@id'],
};

/*export const DataTypeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rdfs:Datatype', // json-ld
  '@type': 'rdfs:Datatype', // json-ld
  title: 'DataType',
  description: 'DataType',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    'label': 'rdfs:label',
  },
  properties: {
    '@id': {
      title: 'URI',
      type: 'string',
      format: 'iri',
    },
    '@type': {
      title: 'Class',
      type: 'string',
      format: 'iri',
    },
    label: {
      title: 'Label',
      type: 'string',
    },
    // isDefinedBy: {
    //   type: 'string',
    //   format: 'iri',
    //   uri: 'rdfs:isDefinedBy',
    // },
  },
  required: ['@id'],
};*/
