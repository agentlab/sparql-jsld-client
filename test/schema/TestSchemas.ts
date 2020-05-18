import { JSONSchema6forRdf, JsObject } from '../../src/ObjectProvider';

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
      '@id': 'oslc:modifiedBy',
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
  defaultIndividNs: 'cpgu:',
  defaultFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
  iconReference: 'http://cpgu.kbpm.ru/ns/rm/images/use-case',
};

export const artifactShape: JsObject = {
  '@id': 'rm:ArtifactShape',
  '@type': 'sh:NodeShape',
  defaultFormat: undefined,
  defaultIndividNs: undefined,
  description: 'Тип ресурса',
  iconReference: undefined,
  inCreationMenu: undefined,
  property: [
    {
      '@id': 'rm:titleShape',
      '@type': 'sh:PropertyShape',
      class: undefined,
      datatype: 'xsd:string',
      description: 'Краткое название требования',
      maxCount: 1,
      minCount: undefined,
      name: 'Название',
      nodeKind: undefined,
      order: 3,
      path: 'dcterms:title',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:descriptionShape',
      '@type': 'sh:PropertyShape',
      class: undefined,
      datatype: 'xsd:string',
      description: 'Информация о требовании',
      maxCount: 1,
      minCount: undefined,
      name: 'Описание',
      nodeKind: undefined,
      order: 4,
      path: 'dcterms:description',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
    {
      '@id': 'rm:identifierShape',
      '@type': 'sh:PropertyShape',
      class: undefined,
      datatype: 'xsd:integer',
      description: 'Числовой идентификатор требования, уникальный только в пределах этой системы',
      maxCount: 1,
      minCount: undefined,
      name: 'Идентификатор',
      nodeKind: undefined,
      order: 2,
      path: 'dcterms:identifier',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:creatorShape',
      '@type': 'sh:PropertyShape',
      class: 'pporoles:User',
      datatype: undefined,
      description: 'Пользователь, создавший требование',
      maxCount: 1,
      minCount: undefined,
      name: 'Кем создан',
      nodeKind: 'sh:BlankNodeOrIRI',
      order: 5,
      path: 'dcterms:creator',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:createdShape',
      '@type': 'sh:PropertyShape',
      class: undefined,
      datatype: 'xsd:dateTime',
      description: 'Когда требование было создано',
      maxCount: 1,
      minCount: undefined,
      name: 'Когда создан',
      nodeKind: undefined,
      order: 6,
      path: 'dcterms:created',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:modifiedByShape',
      '@type': 'sh:PropertyShape',
      class: 'pporoles:User',
      datatype: undefined,
      description: 'Пользователь, изменивший требование',
      maxCount: 1,
      minCount: undefined,
      name: 'Кем изменен',
      nodeKind: 'sh:BlankNodeOrIRI',
      order: 7,
      path: 'oslc:modifiedBy',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'rm:modifiedShape',
      '@type': 'sh:PropertyShape',
      class: undefined,
      datatype: 'xsd:dateTime',
      description: 'Когда требование было изменено',
      maxCount: 1,
      minCount: undefined,
      name: 'Когда изменен',
      nodeKind: undefined,
      order: 8,
      path: 'dcterms:modified',
      shapeModifiability: 'system',
      valueModifiability: 'system',
    },
    {
      '@id': 'nav:processAreaShape',
      '@type': 'sh:PropertyShape',
      class: 'nav:ProjectArea',
      datatype: undefined,
      description: 'Связано с проектной областью',
      maxCount: 1,
      minCount: 0,
      name: 'Проект',
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
      datatype: undefined,
      description: 'Папка, содержащая требования',
      maxCount: 1,
      minCount: undefined,
      name: 'Папка',
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
      datatype: undefined,
      description: 'Формат заполнения/отображения',
      maxCount: 1,
      minCount: undefined,
      name: 'Формат',
      nodeKind: 'sh:IRI',
      order: 11,
      path: 'rm:artifactFormat',
      shapeModifiability: 'system',
      valueModifiability: 'user',
    },
  ],
  targetClass: 'rm:Artifact',
  title: 'Требование',
};
