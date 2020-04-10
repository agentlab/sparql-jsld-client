import { JSONSchema6forRdf } from '../ObjectProvider';

export const ArtifactShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'sh:NodeShape',
  '@type': 'sh:NodeShape',
  title: 'Artifact Shape Schema',
  description: 'Schema of Artifact Shape (Meta-schema)',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    targetClass: 'sh:targetClass',
    title: 'dcterms:title',
    description: 'dcterms:description',
    property: {
      '@id': 'sh:property',
      '@type': 'sh:PropertyShape',
    },
    inCreationMenu: 'rm:inCreationMenu',
    defaultIndividNs: 'rm:defaultIndividNs',
    defaultFormat: 'rm:defaultFormat',
    iconReference: 'rm:iconReference',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Тип',
      type: 'object',
    },
    targetClass: {
      type: 'object',
    },
    title: {
      type: 'string',
    },
    description: {
      type: 'string',
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
    },
  },
  required: ['@id', 'targetClass', 'property'], // arrays should be required
};

export const PropertyShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://example.com/product.schema.json',
  '@id': 'sh:PropertyShape',
  '@type': 'sh:PropertyShape',
  title: 'Property Shape Schema',
  description: 'Schema of Property Shape (Meta-schema)',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    description: 'sh:description',
    datatype: 'sh:datatype',
    path: 'sh:path', // object with unknown type should resolve in Resource URI
    order: 'sh:order',
    name: 'sh:name',
    minCount: 'sh:minCount',
    maxCount: 'sh:maxCount',
    class: 'sh:class',
    nodeKind: 'sh:nodeKind',
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
      title: 'Тип',
      type: 'object',
    },
    name: {
      title: 'Название',
      type: 'string',
    },
    description: {
      title: 'Описание',
      type: 'string',
    },
    path: {
      title: 'Путь',
      type: 'object',
    },
    order: {
      title: 'Приоритет',
      type: 'integer',
    },
    datatype: {
      title: 'Тип данных',
      type: 'object',
    },
    minCount: {
      title: 'Минимальный предел',
      type: 'integer',
    },
    maxCount: {
      title: 'Максимальный предел',
      type: 'integer',
    },
    class: {
      title: 'Класс значений',
      type: 'object',
    },
    nodeKind: {
      type: 'object',
    },
    shapeModifiability: {
      type: 'string',
    },
    valueModifiability: {
      type: 'string',
    },
  },
  required: ['@id', 'path'],
};
