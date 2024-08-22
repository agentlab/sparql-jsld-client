/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { JSONSchema6forRdf, JsObject } from '../../src/ObjectProvider';

export const textFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text';
export const collectionFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Collection';
export const moduleFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module';

export const artifactSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/rdf#ArtifactShape',
  '@id': 'rm:ArtifactShape',
  '@type': 'sh:NodeShape',
  title: 'Artifact',
  description: 'Artifact',
  targetClass: 'rm:Artifact',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    identifier: {
      '@id': 'dcterms:identifier',
      '@type': 'xsd:integer',
    },
    title: {
      '@id': 'dcterms:title',
      '@type': 'xsd:string',
    },
    description: {
      '@id': 'dcterms:description',
      '@type': 'xsd:string',
    },
    creator: {
      '@id': 'dcterms:creator',
      '@type': 'pporoles:User',
    },
    created: {
      '@id': 'dcterms:created',
      '@type': 'xsd:dateTime',
    },
    modifiedBy: {
      '@id': 'oslc:modifiedBy',
      '@type': 'pporoles:User',
    },
    modified: {
      '@id': 'dcterms:modified',
      '@type': 'xsd:dateTime',
    },
    processArea: {
      '@id': 'nav:processArea',
      '@type': 'nav:ProjectArea',
    },
    assetFolder: {
      '@id': 'rm:assetFolder',
      '@type': 'nav:folder',
    },
    artifactFormat: {
      '@id': 'rm:artifactFormat',
      '@type': 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow',
    },
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
    identifier: {
      title: 'Identifier',
      description: 'Numeric identifier, unique within a system',
      type: 'integer',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    title: {
      title: 'Title',
      description: 'Title',
      type: 'string',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    description: {
      title: 'Description',
      description: 'Description',
      type: 'string',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    creator: {
      title: 'Creator',
      description: 'An Agent, created an Artifact',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    created: {
      title: 'Created',
      description: 'When an Artifact was created',
      type: 'string',
      format: 'date-time',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    modifiedBy: {
      title: 'Modified By',
      description: 'An Agent, modified an Artifact',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    modified: {
      title: 'Modified',
      description: 'When an Artifact was modified',
      type: 'string',
      format: 'date-time',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    processArea: {
      title: 'Process Area',
      description: 'Process Area',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    assetFolder: {
      title: 'Folder',
      description: 'Asset folder',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    artifactFormat: {
      title: 'Format',
      description: 'Artifact Format',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
  },
  required: ['@id', '@type', 'title' /*, 'identifier', 'assetFolder', 'artifactFormat'*/],
};

export const genericArtifactSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/classifier#GenericArtifactShape',
  allOf: [{ $ref: 'rm:ArtifactShape' }],
  '@id': 'clss:GenericArtifactShape',
  '@type': 'sh:NodeShape',
  targetClass: 'clss:GenericArtifact',
  type: 'object',
  '@context': {
    alternative: {
      '@id': 'dcterms:alternative',
      '@type': 'xsd:string',
    },
    uri: {
      '@id': 'clss:uri',
      '@type': '@id',
    },
    status: {
      '@id': 'clss:status',
      '@type': 'rmUserTypes:_YwrbNRmREemK5LEaKhoOow',
    },
    abstract: {
      '@id': 'dcterms:abstract',
      '@type': 'xsd:string',
    },
  },
  properties: {
    alternative: {
      title: 'PropertyShape Alternative Name',
      type: 'string',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    uri: {
      title: 'PropertyShape URI Name',
      description: 'PropertyShape URI Description',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    status: {
      title: 'PropertyShape Status Name',
      description: 'PropertyShape Status Description',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    abstract: {
      title: 'PropertyShape Abstract Name',
      type: 'string',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
  },
};

export const classifierSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/classifier#ClassifierShape',
  allOf: [{ $ref: 'clss:GenericArtifactShape' }],
  '@id': 'clss:ClassifierShape',
  '@type': 'sh:NodeShape',
  title: 'RequirementClassShape Classifier Title',
  description: 'RequirementClassShape Classifier Description',
  targetClass: 'clss:Classifier',
  type: 'object',
  //inCreationMenu: true,
  //defaultIndividNs: 'clss:',
  //defaultFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
  //iconReference: 'https://agentlab.eu/ns/rm/images/use-case',
  properties: {},
};

export const classifierCompleteSchema: JSONSchema6forRdf = {
  ...classifierSchema,
  '@context': {
    ...artifactSchema['@context'],
    ...genericArtifactSchema['@context'],
  },
  properties: {
    ...artifactSchema.properties,
    ...genericArtifactSchema.properties,
  },
  required: [...(artifactSchema.required || []), ...(genericArtifactSchema.required || [])],
};

export const artifactShape: JsObject = {
  '@id': 'rm:ArtifactShape',
  '@type': 'sh:NodeShape',
  //defaultFormat: undefined,
  //defaultIndividNs: undefined,
  description: 'Artifact',
  //iconReference: undefined,
  //inCreationMenu: undefined,
  property: [
    {
      '@id': 'rm:identifierShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'xsd:integer',
      description: 'Numeric identifier, unique within a system',
      maxCount: 1,
      //minCount: undefined,
      name: 'Identifier',
      //nodeKind: undefined,
      order: 2,
      path: 'dcterms:identifier',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:titleShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'xsd:string',
      description: 'Title',
      maxCount: 1,
      minCount: 1,
      name: 'Title',
      //nodeKind: undefined,
      order: 3,
      path: 'dcterms:title',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:xhtmlTextShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'rdf:HTML',
      description: 'Formatted text',
      maxCount: 1,
      //minCount: undefined,
      name: 'Text',
      //nodeKind: undefined,
      order: 4,
      path: 'rm:xhtmlText',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:descriptionShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'xsd:string',
      description: 'Description',
      maxCount: 1,
      //minCount: undefined,
      name: 'Description',
      //nodeKind: undefined,
      order: 4,
      path: 'dcterms:description',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:creatorShape',
      '@type': 'sh:PropertyShape',
      class: 'pporoles:User',
      //datatype: undefined,
      description: 'An Agent, created an Artifact',
      maxCount: 1,
      //minCount: undefined,
      name: 'Creator',
      nodeKind: 'sh:BlankNodeOrIRI',
      order: 5,
      path: 'dcterms:creator',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:createdShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'xsd:dateTime',
      description: 'When an Artifact was created',
      maxCount: 1,
      //minCount: undefined,
      name: 'Created',
      //nodeKind: undefined,
      order: 6,
      path: 'dcterms:created',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:modifiedByShape',
      '@type': 'sh:PropertyShape',
      class: 'pporoles:User',
      //datatype: undefined,
      description: 'An Agent, modified an Artifact',
      maxCount: 1,
      //minCount: undefined,
      name: 'Modified By',
      nodeKind: 'sh:BlankNodeOrIRI',
      order: 7,
      path: 'oslc:modifiedBy',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:modifiedShape',
      '@type': 'sh:PropertyShape',
      //class: undefined,
      datatype: 'xsd:dateTime',
      description: 'When an Artifact was modified',
      maxCount: 1,
      //minCount: undefined,
      name: 'Modified',
      //nodeKind: undefined,
      order: 8,
      path: 'dcterms:modified',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'nav:processAreaShape',
      '@type': 'sh:PropertyShape',
      class: 'nav:ProjectArea',
      //datatype: undefined,
      description: 'Process Area',
      maxCount: 1,
      minCount: 0,
      name: 'Process Area',
      nodeKind: 'sh:IRI',
      order: 9,
      path: 'nav:processArea',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:assetFolderShape',
      '@type': 'sh:PropertyShape',
      class: 'nav:folder',
      //datatype: undefined,
      description: 'Asset folder',
      maxCount: 1,
      //minCount: undefined,
      name: 'Folder',
      nodeKind: 'sh:IRI',
      order: 10,
      path: 'rm:assetFolder',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:formatShape',
      '@type': 'sh:PropertyShape',
      class: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow',
      //datatype: undefined,
      description: 'Artifact Format',
      maxCount: 1,
      //minCount: undefined,
      name: 'Format',
      nodeKind: 'sh:IRI',
      order: 11,
      path: 'rm:artifactFormat',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
  ],
  targetClass: 'rm:Artifact',
  title: 'Artifact',
};

export const linkSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'https://agentlab.eu/ns/rm/user-types#UsedInShape',
  '@id': 'rm:LinkShape',
  '@type': 'sh:NodeShape',
  type: 'object',
  title: 'Link',
  description: 'Link.',
  targetClass: 'rm:Link',
  '@context': {
    '@type': 'rdf:type',
    creator: {
      '@id': 'dcterms:creator',
      '@type': 'pporoles:User',
    },
    created: {
      '@id': 'dcterms:created',
      '@type': 'xsd:dateTime',
    },
    modifiedBy: {
      '@id': 'oslc:modifiedBy',
      '@type': 'pporoles:User',
    },
    modified: {
      '@id': 'dcterms:modified',
      '@type': 'xsd:dateTime',
    },
    processArea: {
      '@id': 'nav:processArea',
      '@type': 'nav:ProjectArea',
    },
    object: {
      '@id': 'rdf:object',
      '@type': 'rm:Artifact',
    },
    subject: {
      '@id': 'rdf:subject',
      '@type': 'rm:Artifact',
    },
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
    creator: {
      type: 'string',
      format: 'iri',
      title: 'Creator',
      description: 'An Agent, created an Artifact',
      shapeModifiability: 'system',
    },
    created: {
      type: 'string',
      format: 'date-time',
      title: 'Created',
      description: 'When an Artifact was created',
      shapeModifiability: 'system',
    },
    modifiedBy: {
      type: 'string',
      format: 'iri',
      title: 'Modified By',
      description: 'An Agent, modified an Artifact',
      shapeModifiability: 'system',
    },
    modified: {
      type: 'string',
      format: 'date-time',
      title: 'Modified',
      description: 'When an Artifact was modified',
      shapeModifiability: 'system',
    },
    processArea: {
      type: 'string',
      format: 'iri',
      title: 'Process Area',
      description: 'Process Area',
      shapeModifiability: 'system',
    },
    object: {
      type: 'string',
      format: 'iri',
      title: 'Object',
      description: 'The object of the subject RDF statement.',
      shapeModifiability: 'system',
    },
    subject: {
      type: 'string',
      format: 'iri',
      title: 'Subject',
      description: 'The subject of the subject RDF statement.',
      shapeModifiability: 'system',
    },
  },
  required: ['@id', '@type', 'object', 'subject'],
};

export const usedInSchema: JSONSchema6forRdf = {
  ...linkSchema,
  '@id': 'rmUserTypes:UsedInShape',
  title: 'UsedIn Link',
  description: 'Connects Artifacts in Collection.',
  targetClass: 'rmUserTypes:UsedIn',
};

export const usedInModuleSchema: JSONSchema6forRdf = {
  ...usedInSchema,
  allOf: [{ $ref: 'rmUserTypes:UsedInShape' }],
  '@id': 'rmUserTypes:UsedInModuleShape',
  title: 'UsedInModule Link',
  description: 'Connects Artifacts in Module.',
  targetClass: 'rmUserTypes:UsedInModule',
  '@context': {
    ...usedInSchema['@context'],
    parentBinding: {
      '@id': 'rmUserTypes:parentBinding',
      '@type': 'rm:Artifact',
    },
    depth: {
      '@id': 'rmUserTypes:depth',
      '@type': 'xsd:integer',
    },
    bookOrder: {
      '@id': 'rmUserTypes:bookOrder',
      '@type': 'xsd:integer',
    },
    sectionNumber: {
      '@id': 'rmUserTypes:sectionNumber',
      '@type': 'xsd:string',
    },
    isHeading: {
      '@id': 'rmUserTypes:isHeading',
      '@type': 'xsd:boolean',
    },
  },
  properties: {
    ...usedInSchema.properties,
    parentBinding: {
      type: 'string',
      format: 'iri',
      title: 'Parent Binding',
      description: 'Parent Binding.',
      shapeModifiability: 'system',
    },
    depth: {
      type: 'integer',
      title: 'Depth',
      description: 'Depth',
      shapeModifiability: 'system',
    },
    bookOrder: {
      type: 'integer',
      title: 'Book Order',
      description: 'Book Order',
      shapeModifiability: 'system',
    },
    sectionNumber: {
      type: 'string',
      title: 'Section Number',
      description: 'Section Number',
      shapeModifiability: 'system',
    },
    isHeading: {
      type: 'boolean',
      title: 'Is Heading',
      description: 'Is Heading',
      shapeModifiability: 'system',
    },
  },
  required: [...(usedInSchema.required || []), 'parentBinding', 'depth', 'bookOrder', 'sectionNumber'],
};

export const { property: artifactShapeProperty, ...artifactShapeNoProperty } = artifactShape;

export const ProductCardShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'iot:ProductCardCardsShape',
  '@type': 'sh:NodeShape',
  title: '',
  description: '',
  targetClass: 'iot:ProductCard',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    name: {
      '@id': 'iot:name',
      '@type': 'xsd:string',
    },
    lastMonthSalesValue: {
      '@id': 'iot:lastMonthSalesValue',
      '@type': 'xsd:int',
    },
    saleValue: {
      '@id': 'iot:saleValue',
      '@type': 'xsd:int',
    },
    brand: {
      '@id': 'iot:brand',
      '@type': 'iot:Brand',
    },
    seller: {
      '@id': 'iot:seller',
      '@type': 'iot:Seller',
    },
    imageUrl: {
      '@id': 'iot:imageUrl',
      '@type': '@id',
    },
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
    // mandatory str
    name: {
      type: 'string',
    },
    // mandatory int
    lastMonthSalesValue: {
      type: 'integer',
    },
    // optional int
    saleValue: {
      title: 'Sale Value',
      type: 'integer',
    },
    // optional reference
    brand: {
      title: 'Brand',
      type: 'string',
      format: 'iri',
    },
    // mandatory ref
    seller: {
      title: 'Seller',
      type: 'string',
      format: 'iri',
    },
    // optional array
    imageUrl: {
      title: 'Image URL',
      type: 'array',
      items: {
        type: 'string',
        format: 'iri',
      },
    },
  },
  required: ['@id', '@type', 'name', 'lastMonthSalesValue', 'seller'],
};

export const HSObservationShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'iot:HSObservationCardsShape',
  '@type': 'sh:NodeShape',
  title: '',
  description: '',
  targetClass: 'iot:HSObservation',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    product: {
      '@id': 'iot:product',
    },
    parsedAt: {
      '@id': 'iot:parsedAt',
      '@type': 'xsd:dateTime',
    },
    price: {
      '@id': 'iot:price',
      '@type': 'xsd:int',
    },
    totalSales: {
      '@id': 'iot:totalSales',
      '@type': 'xsd:int',
    },
    categoryPopularity: {
      '@id': 'iot:categoryPopularity',
      '@type': 'xsd:double',
    },
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
    product: {
      type: 'object',
    },
    parsedAt: {
      type: 'string',
      format: 'date-time',
    },
    // optional int
    price: {
      type: 'integer',
    },
    // mandatory int
    totalSales: {
      type: 'integer',
    },
    // optional double
    categoryPopularity: {
      type: 'number',
    },
  },
  required: ['@id', '@type', 'product', 'parsedAt', 'totalSales'],
};

export const ProductCardShapeSchemaForCardsList: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'iot:ProductCardShapeForCardsList',
  '@type': 'sh:NodeShape',
  title: '',
  description: '',
  targetClass: 'iot:ProductCard',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    name: {
      '@id': 'iot:name',
      '@type': 'xsd:string',
    },
    lastMonthSalesValue: {
      '@id': 'iot:lastMonthSalesValue',
      '@type': 'xsd:int',
    },
    hasObservations: {
      '@reverse': 'iot:product',
    },
    saleValue: {
      '@id': 'iot:saleValue',
      '@type': 'xsd:int',
    },
    seller: {
      '@id': 'iot:seller',
      '@type': 'iot:Seller',
    },
    imageUrl: {
      '@id': 'iot:imageUrl',
      '@type': '@id',
    },
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
    name: {
      type: 'string',
    },
    lastMonthSalesValue: {
      type: 'integer',
    },
    // mandatory reverse array
    hasObservations: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
    // optional int
    saleValue: {
      title: 'Sale Value',
      type: 'integer',
    },
    // optional reference
    seller: {
      title: 'Seller',
      type: 'string',
      format: 'iri',
    },
    // array
    imageUrl: {
      title: 'Image URL',
      type: 'array',
      items: {
        type: 'string',
        format: 'iri',
      },
    },
  },
  required: ['@id', '@type', 'name', 'lastMonthSalesValue', 'hasObservations'],
};

export const HSObservationShapeSchemaForCardsList: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'iot:HSObservationShapeForCardsList',
  '@type': 'sh:NodeShape',
  title: '',
  description: '',
  targetClass: 'iot:HSObservation',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    parsedAt: {
      '@id': 'iot:parsedAt',
      '@type': 'xsd:dateTime',
    },
    price: {
      '@id': 'iot:price',
      '@type': 'xsd:int',
    },
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
    parsedAt: {
      type: 'string',
      format: 'date-time',
    },
    price: {
      type: 'integer',
    },
  },
  required: ['@id', '@type', 'parsedAt', 'price'],
};
