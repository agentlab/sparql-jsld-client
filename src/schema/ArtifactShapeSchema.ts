/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { JSONSchema7LD } from '../ObjectProvider';

export const ArtifactShapeSchema: JSONSchema7LD = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'sh:NodeShapeShape',
  '@type': 'sh:NodeShape',
  title: 'Artifact Shape Schema',
  description: 'Schema of Artifact Shape (Meta-schema)',
  targetClass: 'sh:NodeShape',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    targetClass: {
      '@id': 'sh:targetClass',
      '@type': '@id',
    },
    title: 'dcterms:title',
    description: 'dcterms:description',
    //property: {
    //  '@id': 'sh:property',
    //  '@type': 'sh:PropertyShape',
    //},
    property: 'sh:property',
    inCreationMenu: 'rm:inCreationMenu',
    defaultIndividNs: {
      '@id': 'rm:defaultIndividNs',
      '@type': 'xsd:anyURI', //'@id',
    },
    defaultFormat: {
      '@id': 'rm:defaultFormat',
      '@type': '@id',
    },
    iconReference: {
      '@id': 'rm:iconReference',
      '@type': '@id',
    },
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Class',
      type: 'object',
    },
    targetClass: {
      type: 'object',
    },
    title: {
      type: 'string',
      propertyRole: 'dash:LabelRole',
      singleLine: true,
    },
    description: {
      type: 'string',
      propertyRole: 'dash:DescriptionRole',
    },
    property: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    inCreationMenu: {
      type: 'boolean',
      default: false,
    },
    defaultIndividNs: {
      type: 'string',
      format: 'iri',
    },
    defaultFormat: {
      type: 'object',
    },
    iconReference: {
      type: 'object',
      propertyRole: 'dash:IconRole',
    },
  },
  required: ['@id', 'targetClass' /*, 'property'*/], // arrays should be required
};

export const PropertyShapeSchema: JSONSchema7LD = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://example.com/product.schema.json',
  '@id': 'sh:PropertyShapeShape',
  '@type': 'sh:NodeShape',
  title: 'Property Shape Schema',
  description: 'Schema of Property Shape (Meta-schema)',
  targetClass: 'sh:PropertyShape',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    path: {
      // object with unknown type should resolve in Resource URI
      '@id': 'sh:path',
      '@type': '@id',
    },
    name: 'sh:name',
    description: 'sh:description',
    order: {
      '@id': 'sh:order',
      '@type': 'xsd:integer',
    },
    datatype: {
      '@id': 'sh:datatype',
      '@type': '@id',
    },
    class: {
      '@id': 'sh:class',
      '@type': '@id',
    },
    nodeKind: {
      '@id': 'sh:nodeKind',
      '@type': '@id',
    },
    //defaultValue: {
    //  '@id': 'sh:defaultValue',
    //},
    minCount: {
      '@id': 'sh:minCount',
      '@type': 'xsd:integer',
    },
    maxCount: {
      '@id': 'sh:maxCount',
      '@type': 'xsd:integer',
    },
    // DASH properties
    propertyRole: {
      '@id': 'dash:propertyRole',
      '@type': '@id',
    },
    editor: {
      '@id': 'dash:editor',
      '@type': '@id',
    },
    viewer: {
      '@id': 'dash:viewer',
      '@type': '@id',
    },
    singleLine: {
      '@id': 'dash:singleLine',
      '@type': 'xsd:boolean',
    },
    //permissions extension
    shapeModifiability: 'rm:shapeModifiability',
    valueModifiability: 'rm:valueModifiability',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Class',
      type: 'object',
    },
    name: {
      title: 'Name',
      type: 'string',
      propertyRole: 'dash:LabelRole',
      singleLine: true,
    },
    description: {
      title: 'Description',
      type: 'string',
      propertyRole: 'dash:DescriptionRole',
    },
    path: {
      title: 'path',
      type: 'object',
    },
    order: {
      title: 'Order',
      type: 'integer',
    },
    datatype: {
      title: 'DataType',
      type: 'object',
    },
    class: {
      title: 'Value Class',
      type: 'object',
    },
    nodeKind: {
      type: 'object',
    },
    //defaultValue: {
    //  title: 'Default Value',
    //},
    minCount: {
      title: 'Min Count',
      type: 'integer',
    },
    maxCount: {
      title: 'Max Count',
      type: 'integer',
    },
    // DASH properties
    propertyRole: {
      type: 'string',
      format: 'iri',
      title: 'Property Role',
    },
    editor: {
      type: 'string',
      format: 'iri',
      title: 'Editor',
    },
    viewer: {
      type: 'string',
      format: 'iri',
      title: 'Viewer',
    },
    singleLine: {
      type: 'boolean',
      title: 'Single Line',
    },
    //permissions extension
    shapeModifiability: {
      type: 'string',
    },
    valueModifiability: {
      type: 'string',
    },
  },
  required: ['@id', 'path'],
};
