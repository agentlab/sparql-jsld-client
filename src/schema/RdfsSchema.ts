import { JSONSchema6forRdf } from '../ObjectProvider';

export const NopSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rdfs:Nop', // json-ld
  '@type': 'rdfs:Nop', // json-ld
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
  },
  required: ['@id'],
};

export const ResourceSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rdfs:Resource', // json-ld
  '@type': 'rdfs:Resource', // json-ld
  title: 'Resource Schema',
  description: 'Schema of RDF Resource',
  type: 'object',
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      '@id': 'rdf:type',
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    label: {
      '@id': 'rdfs:label',
      title: 'Метка',
      type: 'string',
    },
  },
  required: ['@id'],
};

export const ClassSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rdfs:Class', // json-ld
  '@type': 'rdfs:Class', // json-ld
  title: 'Class Schema',
  description: 'Schema of RDF Resource',
  type: 'object',
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      '@id': 'rdf:type',
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    //label: {
    //  '@id': 'rdfs:label',
    //  title: 'Метка',
    //  type: 'string',
    //},
    //subClassOf: {
    //  '@id': 'rdfs:subClassOf',
    //  title: 'Подкласс классов',
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
  title: 'Типы данных',
  description: 'Типы данных',
  type: 'object',
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      '@id': 'rdf:type',
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    label: {
      '@id': 'rdfs:label',
      type: 'string',
      title: 'Метка',
    },
    // isDefinedBy: {
    //   type: 'string',
    //   format: 'iri',
    //   uri: 'rdfs:isDefinedBy',
    // },
  },
  required: ['@id'],
};*/
