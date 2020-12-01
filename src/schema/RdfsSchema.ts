import { JSONSchema6forRdf } from '../ObjectProvider';

export const NopSchema: any/*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://cpgu.kbpm.ru/ns/rm/rdf#NopSchema',
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

export const ResourceSchema: any/*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://cpgu.kbpm.ru/ns/rm/rdf#ResourceSchema',
  '@id': 'rm:ResourceSchema', // json-ld
  '@type': 'sh:NodeShape', // json-ld
  title: 'Resource Schema',
  description: 'Schema of RDF Resource',
  targetClass: 'rdfs:Resource',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    'label': 'rdfs:label',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
      title: 'URI',
    },
    '@type': {
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    label: {
      title: 'Метка',
      type: 'string',
    },
  },
  required: ['@id'],
};

export const ClassSchema: any/*JSONSchema6forRdf*/ = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://cpgu.kbpm.ru/ns/rm/rdf#Class',
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
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    label: {
      title: 'Метка',
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
