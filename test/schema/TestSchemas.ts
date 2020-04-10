import { JSONSchema6forRdf } from '../../src/ObjectProvider';

export const textFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text';
export const collectionFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Collection';
export const moduleFormatUri = 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module';

export const artifactSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'rm:Artifact',
  '@id': 'rm:Artifact',
  '@type': 'rm:Artifact',
  title: 'Требование',
  description: 'Тип ресурса',
  type: 'object',
  '@context': {
    '@type': 'rdf:type',
    identifier: 'dcterms:identifier',
    title: 'dcterms:title',
    description: 'dcterms:description',
    creator: {
      '@id': 'dcterms:creator',
      '@type': 'pporoles:User',
    },
    created: 'dcterms:created',
    modifiedBy: {
      '@id': 'dcterms:modifiedBy',
      '@type': 'pporoles:User',
    },
    modified: 'dcterms:modified',
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
      title: 'Тип',
      type: 'string',
      format: 'iri',
    },
    identifier: {
      title: 'Идентификатор',
      description: 'Числовой идентификатор требования, уникальный только в пределах этой системы',
      type: 'integer',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    title: {
      title: 'Название',
      description: 'Краткое название требования',
      type: 'string',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    description: {
      title: 'Описание',
      description: 'Информация о требовании',
      type: 'string',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    creator: {
      title: 'Кем создан',
      description: 'Пользователь, создавший требование',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    created: {
      title: 'Когда создан',
      description: 'Когда требование было создано',
      type: 'string',
      format: 'date-time',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    modifiedBy: {
      title: 'Кем изменен',
      description: 'Пользователь, изменивший требование',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    modified: {
      title: 'Когда изменен',
      description: 'Когда требование было изменено',
      type: 'string',
      format: 'date-time',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    processArea: {
      title: 'Проект',
      description: 'Связано с проектной областью',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'system',
    },
    assetFolder: {
      title: 'Папка',
      description: 'Папка, содержащая требования',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
    artifactFormat: {
      title: 'Формат',
      description: 'Формат заполнения/отображения',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'system',
      //valueModifiability: 'user',
    },
  },
  required: ['@id', '@type' /*, 'identifier', 'title', 'assetFolder', 'artifactFormat'*/],
};

export const genericArtifactSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  allOf: [{ $ref: 'rm:Artifact' }],
  '@id': 'cpgu:GenericArtifact',
  '@type': 'cpgu:GenericArtifact',
  type: 'object',
  '@context': {
    alternative: 'dcterms:alternative',
    uri: 'cpgu:uri',
    status: {
      '@id': 'cpgu:status',
      '@type': 'rmUserTypes:_YwrbNRmREemK5LEaKhoOow',
    },
    abstract: 'dcterms:abstract',
  },
  properties: {
    alternative: {
      title: 'alternative',
      type: 'string',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    uri: {
      title: 'URI',
      description: 'Задает идентификатор ресурса',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    status: {
      title: 'Статус',
      description:
        'Определяет состояние ресурса в пакете. Позволяет, например, сообщить о том, что ресурс удален из системы',
      type: 'string',
      format: 'iri',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
    abstract: {
      title: 'abstract',
      type: 'string',
      shapeModifiability: 'user',
      //valueModifiability: 'user',
    },
  },
};

export const classifierSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  allOf: [{ $ref: 'cpgu:GenericArtifact' }],
  '@id': 'cpgu:Classifier',
  '@type': 'cpgu:Classifier',
  type: 'object',
  title: 'Классификатор',
  description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него)',
  inCreationMenu: true,
  defaultIndividNs: 'http://cpgu.kbpm.ru/ns/rm/cpgu#',
  defaultFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
  iconReference: 'http://cpgu.kbpm.ru/ns/rm/images/use-case',
};
