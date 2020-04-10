import moment from 'moment';
import uuid62 from 'uuid62';
import Ajv from 'ajv';
import { namedNode, triple, variable } from '@rdfjs/data-model';
import { JSONSchema6Definition } from 'json-schema';
import { isEmpty } from 'lodash';
import { SparqlGen, getSchemaPropType, addprops2vars2props } from './SparqlGen';
import { SparqlClient, Bindings } from './SparqlClient';
import { SparqlClientImpl } from './SparqlClientImpl';

import { ResourceSchema, ClassSchema } from './schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from './schema/ArtifactShapeSchema';

import {
  ObjectProvider,
  JSONSchema6forRdf,
  JsObject,
  JSONSchema6DefinitionForRdfProperty,
  copyObjectProps,
  copyUniqueObjectPropsWithRenameOrFilter,
  copyUniqueArrayElements,
} from './ObjectProvider';

function allProsFromSchemas(
  schemas: JSONSchema6forRdf[],
): [{ [key: string]: JSONSchema6DefinitionForRdfProperty }, {}] {
  let allProperty: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
  let allContext: object = {};
  schemas.forEach((schema) => {
    allProperty = { ...allProperty, ...schema.properties };
    if (typeof schema['@context'] === 'object') {
      allContext = { ...allContext, ...schema['@context'] };
    }
  });
  return [allProperty, allContext];
}

/*function formatRow(row: JsObject): JsObject {
  delete row['schema'];
  return row;
}*/

/*function getTypeOfProperty(prop: JsObject): JsObject {
  const result: JsObject = {};
  const dataType = prop.dataType ? prop.dataType.replace('xsd:', '') : '';
  let type = '';
  let format = '';
  if (dataType === 'string' || dataType === 'integer') {
    type = dataType;
  } else {
    if (dataType === 'positiveInteger') {
      type = 'integer';
      format = dataType;
    } else {
      type = 'string';
      if (dataType === 'dateTime') {
        format = 'date-time';
      } else {
        format = dataType || 'iri';
      }
    }
  }
  if (prop.maxCount && prop.maxCount > 1) {
    result['type'] = 'array';
    result['items'] = {
      type: type,
    };
    if (format) {
      result['items']['format'] = format;
    }
  } else {
    result['type'] = type;
    if (format) {
      result['format'] = format;
    }
  }
  return result;
}*/

const schemaNonPrimitivePropsKeys = ['@context', 'properties', 'required'];

function combineProperties(oldObj: any, newObj: any, schema: JSONSchema6forRdf): any {
  const newData: any = {};
  Object.keys(oldObj).forEach((key) => {
    if (schema.properties && oldObj[key] !== newObj[key]) {
      if (schema.properties[key] && schema.properties[key].type === 'array') {
        newData[key] = Array.isArray(oldObj[key]) ? [...oldObj[key], newObj[key]] : [oldObj[key], newObj[key]];
        return;
      }
    }
    newData[key] = oldObj[key];
  });
  return newData;
}

function createObjectWithoutRepetitions(objects: any[], schema: JSONSchema6forRdf): any[] {
  const newData = new Map();
  const usedUri: any[] = [];
  objects.forEach((object) => {
    if (usedUri.indexOf(object['@id']) === -1) {
      usedUri.push(object['@id']);
      newData.set(object['@id'], object);
    } else {
      const oldObj = newData.get(object['@id']);
      const newObj = combineProperties(oldObj, object, schema);
      newData.set(object['@id'], newObj);
    }
  });
  return Array.from(newData, (e) => e[1]);
}

/*function groupBySchema(response: JsObject[], schema: any): { [key: string]: any[] } {
  const sparqlGen = new SparqlGen();
  const schemasProps: { [key: string]: any[] } = {};

  response.forEach((row) => {
    const schemaUri = sparqlGen.abbreviateIri(row['schema']);
    schemasProps[schemaUri] = schemasProps[schemaUri] ? [...schemasProps[schemaUri], formatRow(row)] : [formatRow(row)];
  });
  Object.keys(schemasProps).forEach((key) => {
    schemasProps[key] = createObjectWithoutRepetitions(schemasProps[key], schema);
  });
  return schemasProps;
}*/

function propertyNameShapeToSchema(shapePropsUri: string): string {
  const [, , propertyKey] = shapePropsUri.match(/^([\d\w-_]+):([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', '', ''];
  return propertyKey;
}

/**
 * Creates JSON Schema property definition and JSON-LD @context definition from SHACL property shape
 * @param shapeProp
 * @param shapePropUri
 * @param schemaProps
 * @param schemaContexts
 * @param schemaReqs
 * @returns JSON Schema property key for created property definition and JSON-LD @context definition
 *   or undefined if JSON Schema definition for property cannot be created
 */
function propertyShapeToJsonSchemaProperty(
  shapeProp: JsObject,
  shapePropUri: string,
  schemaProps: JsObject,
  schemaContexts: JsObject,
  schemaReqs: string[],
): string | undefined {
  if (shapePropUri) {
    const shapePropKey = propertyNameShapeToSchema(shapePropUri);
    schemaProps[shapePropKey] = {};
    let schemaProp: JsObject = schemaProps[shapePropKey];
    //cardinality
    if (shapeProp.maxCount > 1) {
      schemaProp.type = 'array';
      schemaProp = schemaProp.items;
    }
    if (shapeProp.minCount) {
      if (shapeProp.minCount > 0) {
        schemaReqs.push(shapePropKey);
      }
    }
    //element type
    if (shapeProp.datatype) {
      if (shapeProp.datatype === 'xsd:dateTime') {
        schemaProp.type = 'string';
        schemaProp.format = 'date-time';
      }
      if (shapeProp.datatype === 'xsd:string') schemaProp.type = 'string';
      if (shapeProp.datatype === 'xsd:integer') schemaProp.type = 'integer';
      if (shapeProp.datatype === 'xsd:positiveInteger') schemaProp.type = 'integer';
      if (shapeProp.datatype === 'xsd:decimal') schemaProp.type = 'integer';
      if (shapeProp.datatype === 'xsd:boolean') schemaProp.type = 'boolean';
      if (shapeProp.datatype === 'xsd:base64Binary') {
        schemaProp.type = 'string';
        schemaProp.contentEncoding = 'base64';
      }
      schemaContexts[shapePropKey] = shapePropUri;
    }
    if (shapeProp.nodeKind) {
      if (shapeProp.nodeKind === 'sh:IRI' || shapeProp.nodeKind === 'sh:BlankNodeOrIRI') {
        schemaProp.type = 'string';
        schemaProp.format = 'iri';
        if (shapeProp.class) {
          schemaContexts[shapePropKey] = {
            '@id': shapePropUri,
            '@type': shapeProp.class,
          };
        } else {
          // url field for unknown class
          schemaContexts[shapePropKey] = shapePropUri;
        }
      }
    }
    //labels
    if (shapeProp.name) schemaProp.title = shapeProp.name;
    if (shapeProp.description) schemaProp.description = shapeProp.description;
    //modifiability
    if (shapeProp.shapeModifiability) schemaProp.shapeModifiability = shapeProp.shapeModifiability;
    //if (shapeProp.valueModifiability) schemaProp.valueModifiability = shapeProp.valueModifiability;
    return shapePropKey;
  }
  return undefined;
}

const uiMapping: JsObject = {
  '@id': {
    'ui:widget': 'UriWithCopyWidget',
  },
  '@type': {
    'ui:widget': 'ArtifactTypeWidget',
  },
  uri: {
    'ui:widget': 'BaseInput',
  },
  creator: {
    'ui:widget': 'UserWidget',
  },
  modifiedBy: {
    'ui:widget': 'UserWidget',
  },
  description: {
    'ui:widget': 'textarea',
  },
  /*type: {
    'ui:widget': 'ArtifactTypeWidget',
  },*/
  artifactFormat: {
    'ui:widget': 'ArtifactFormatWidget',
  },
  assetFolder: {
    'ui:widget': 'FolderWidget',
  },
  difficulty: {
    'ui:widget': 'DifficultyWidget',
  },
  businessPriority: {
    'ui:widget': 'BusinessPriorityWidget',
  },
  status: {
    'ui:widget': 'StatusWidget',
  },
};

function propertyShapeToUiSchema(
  propShape: JsObject,
  propsSchema: JsObject,
  propKey: string,
  uiSchema: JsObject,
): void {
  uiSchema[propKey] = {};
  const propUiSchema = uiSchema[propKey];
  const propSchema = propsSchema[propKey];
  const widget = uiMapping[propKey];
  if (widget && widget['ui:widget']) propUiSchema['ui:widget'] = widget['ui:widget'];
  else {
    if (propSchema.type === 'string') {
      propUiSchema['ui:widget'] = 'BaseInput';
    } else if (propSchema.type === 'object') {
      propUiSchema['ui:widget'] = 'BaseInput'; //TODO create default widget for object
    }
  }
  if (propShape.valueModifiability != 'user') propUiSchema['ui:disabled'] = true;
  if (propShape.order) propUiSchema['ui:order'] = propShape.order;
}

function propertyShapesToSchemaProperties(
  shapeProps: any[],
): [{ [key: string]: JSONSchema6DefinitionForRdfProperty }, JsObject, string[], JsObject] {
  const schemaProps: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
  const schemaContexts: JsObject = {};
  const schemaReqs: string[] = [];
  const uiSchema: JsObject = {};
  shapeProps.forEach((shapeProp) => {
    const schemaPropUri = shapeProp.path;
    const propKey = propertyShapeToJsonSchemaProperty(
      shapeProp,
      schemaPropUri,
      schemaProps,
      schemaContexts,
      schemaReqs,
    );
    if (propKey) {
      propertyShapeToUiSchema(shapeProp, schemaProps, propKey, uiSchema);
    }
  });
  return [schemaProps, schemaContexts, schemaReqs, uiSchema];
}

//TODO: only works with {} form of @context. String [] and string form are not supported.
/**
 * Adds to child schema unique elements from parentSchema's properties: @context, properties, required
 * Does not copy props from parent schema if prop key present in schema
 * @param schema
 * @param parentSchema
 */
function addToSchemaParentSchema(schema: JSONSchema6forRdf, parentSchema: JSONSchema6forRdf): JSONSchema6forRdf {
  const parentCtx = parentSchema['@context'];
  if (parentCtx && typeof parentCtx !== 'string' && !Array.isArray(parentCtx)) {
    if (!schema['@context']) schema['@context'] = {};
    const schemaCtx = schema['@context'];
    if (typeof schemaCtx !== 'string' && !Array.isArray(schemaCtx)) {
      copyObjectProps(schemaCtx, parentCtx);
    }
  }
  const parentProps = parentSchema.properties;
  if (parentProps) {
    if (!schema.properties) schema.properties = {};
    const schemaProps = schema.properties;
    copyObjectProps(schemaProps, parentProps);
  }
  const parentReq = parentSchema.required;
  if (schema && parentReq) {
    if (!schema.required) schema.required = [];
    const schemaReq = schema.required;
    copyUniqueArrayElements(schemaReq, parentReq);
  }
  return schema;
}

/*function isPromise(subject: any): boolean {
  if (subject === undefined) return false;
  return typeof subject.then == 'function';
}*/

export class ObjectProviderImpl implements ObjectProvider {
  graphUri = '';
  schemaValidators: any = {};
  schemas: { [key: string]: JSONSchema6forRdf | Promise<JSONSchema6forRdf> } = {};
  uiSchemas: JsObject = {};
  defaultQueryPrefixes: { [s: string]: string } = {
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
  };
  queryPrefixes: { [s: string]: string } = this.defaultQueryPrefixes;

  user = 'users:guest';
  processArea = 'projects:gishbbProject';

  sparqlGen = new SparqlGen(this.queryPrefixes);
  client: SparqlClient = new SparqlClientImpl();

  public constructor() {
    console.log('Create ObjectProviderImpl');
    //this.client = client;
    this.addSchema(ResourceSchema);
    this.addSchema(ClassSchema);
    //this.addSchema(DataTypeSchema);

    this.addSchema(ArtifactShapeSchema);
    this.addSchema(PropertyShapeSchema);
  }

  setClient(client: SparqlClient): void {
    this.client = client;
  }

  getClient(): SparqlClient {
    return this.client;
  }

  async getQueryPrefixes(): Promise<{ [s: string]: string }> {
    if (this.queryPrefixes !== this.defaultQueryPrefixes)
      return this.queryPrefixes;
    await this.reloadQueryPrefixes();
    return this.queryPrefixes;
  }

  async reloadQueryPrefixes(): Promise<void> {
    console.log('reloadQueryPrefixes start');
    let ns = await this.client.getNamespaces();
    console.log('reloadQueryPrefixes ns =', ns);
    if (ns && !isEmpty(ns)) {
      this.queryPrefixes = ns;
      this.sparqlGen.setQueryPrefixes(this.queryPrefixes);
    }
    console.log('reloadQueryPrefixes end');
  }

  setUser(user: string): void {
    if (user) user = this.sparqlGen.abbreviateIri(user);
    this.user = user;
  }

  getUser(): string {
    return this.user;
  }

  setProcessArea(processArea: string): void {
    this.processArea = processArea;
  }

  async getUiSchemaByUri(uri: string): Promise<JsObject> {
    let uiSchema: JsObject = {};
    const schemaQueue = await this.findAllSuperSchemas(uri);
    let schemaOrUndefined: JSONSchema6forRdf | undefined;
    while (schemaQueue.length > 0) {
      schemaOrUndefined = schemaQueue.pop();
      if (schemaOrUndefined && schemaOrUndefined['@type']) {
        uiSchema = {
          ...uiSchema,
          ...this.uiSchemas[schemaOrUndefined['@type']],
        };
      }
    }
    let propsOrder = Object.keys(uiSchema).filter((k) => uiSchema[k]['ui:order']);
    propsOrder = propsOrder.sort((a, b) => uiSchema[a]['ui:order'] - uiSchema[b]['ui:order']);
    propsOrder.push('*');
    uiSchema['ui:order'] = propsOrder;
    return uiSchema;
  }

  /**
   * Возвращает по URI сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
   * Т.е. полную, со всеми объявлениями полей и списком required
   * @param uri
   */
  async getSchemaByUri(uri: string): Promise<JSONSchema6forRdf> {
    const schema = { '@id': uri, '@type': uri };
    const schemaQueue = await this.findAllSuperSchemas(uri);
    let schemaOrUndefined: JSONSchema6forRdf | undefined;
    //const tmp = schemaQueue.shift();
    //schema = tmp ? { ...tmp } : { ...ResourceSchema, '@id': uri, '@type': uri };
    //schemaQueue.forEach((parentSchema) => addToSchemaParentSchema(schema, parentSchema));
    //alternative realization of above
    while (schemaQueue.length > 0) {
      schemaOrUndefined = schemaQueue.pop();
      if (schemaOrUndefined) {
        addToSchemaParentSchema(schema, schemaOrUndefined);
      }
    }
    if (schemaOrUndefined) {
      Object.keys(schemaOrUndefined)
        .filter((k) => !schemaNonPrimitivePropsKeys.includes(k))
        .forEach((key) => {
          if (key && schema && schemaOrUndefined) (schema as any)[key] = (schemaOrUndefined as any)[key];
        });
    }
    //console.log('getSchemaByUri END', { uri, schema });
    return schema;
  }

  async getSchemaByUriInternal(uri: string): Promise<JSONSchema6forRdf> {
    //console.log('getSchemaByUriInternal', uri);
    uri = this.sparqlGen.abbreviateIri(uri);
    let schema = this.schemas[uri];
    if (schema === undefined) {
      //console.log('getSchemaByUriInternal NOT found', { uri, schema, schemas: this.schemas });
      schema = this.getSchemaByUriInternalTmpPromise(uri);
      this.schemas[uri] = schema; // if Promise, add Promise
    } else {
      //console.log('getSchemaByUriInternal found', { uri, schema, schemas: this.schemas });
    }
    return schema;
  }

  /**
   * Temporal Promise which could be returned while it is in the process if resolving itself into schema
   * If resolved, rewrites itself with value in schemas
   * @param uri
   */
  async getSchemaByUriInternalTmpPromise(uri: string): Promise<JSONSchema6forRdf> {
    let { schema, uiSchema } = await this.resolveSchemaFromServer(uri);
    //console.debug(() => `getSchemaByUriInternalTmpPromise resolveSchemaFromServer =${schema}`);
    if (!schema) {
      // if not found fallback to Resource with URI and maybe label
      schema = {
        ...ResourceSchema,
        '@id': uri,
        '@type': uri,
      };
    }
    if (!uiSchema) {
      uiSchema = {};
    }
    this.schemas[uri] = schema;
    this.uiSchemas[uri] = uiSchema;
    return schema;
  }

  /**
   * Retrieves element's SHACL Shape from server and converts it to 'JSON Schema + LD' and UI Schema
   * for this element.
   * Element's UI Schema could be further customized during visualization process by concrete View settings
   * @param uri -- element's class uri
   */
  async resolveSchemaFromServer(
    uri: string,
  ): Promise<{ schema: JSONSchema6forRdf | undefined; uiSchema: JsObject | undefined }> {
    //console.log('resolveSchemaFromServer', { uri });
    const shapes = await this.selectObjects(ArtifactShapeSchema, {
      targetClass: uri,
    });
    if (!shapes || shapes.length === 0) return { schema: undefined, uiSchema: undefined };
    const shape = shapes[0];
    const schema: JSONSchema6forRdf = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      '@id': shape.targetClass,
      '@type': shape.targetClass,
      title: shape.title,
      description: shape.description,
      type: 'object',
      '@context': {
        '@type': 'rdf:type',
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
      },
      required: ['@id', '@type'],
    };
    copyUniqueObjectPropsWithRenameOrFilter(schema, shape, {
      property: null,
      targetClass: null,
    });
    // properties from shapes hierarchy
    const classSchema = {
      ...ClassSchema,
      '@id': uri,
      '@type': uri,
    };
    const superClassesUris = await this.selectDirectSuperClasses(classSchema, { '@id': uri });
    //console.debug(() => `resolveSchemaFromServer superClasses=${superClassesUris}`);
    const superClassesSchemas = await Promise.all(
      superClassesUris.filter((c) => c !== 'rdfs:Resource' && c !== uri),
      /*.map(async (superClassUri) => this.getSchemaByUri(superClassUri))*/
    );
    if (superClassesSchemas.length > 0) {
      schema.allOf = [];
      superClassesSchemas.forEach((superClassesSchema) =>
        schema.allOf?.push({
          $ref: superClassesSchema /*['@id']*/,
        }),
      );
    }
    const [props, contexts, reqs, uiSchemaTmp] = propertyShapesToSchemaProperties(shape.property);
    schema.properties = { ...schema.properties, ...props };
    schema['@context'] = { ...(schema['@context'] as any), ...contexts };
    schema.required?.push(...reqs);

    const uiSchema = {
      '@id': {
        ...uiMapping['@id'],
        'ui:disabled': true,
        'ui:order': 0,
      },
      '@type': {
        ...uiMapping['@type'],
        'ui:disabled': true,
        'ui:order': 1,
      },
      ...uiSchemaTmp,
    };
    //console.log('resolveSchemaFromServer END', { uri, schema, uiSchema });
    return { schema, uiSchema };
  }

  async getSchemas(): Promise<{ [key: string]: JSONSchema6forRdf }> {
    const schemasCopy: { [key: string]: JSONSchema6forRdf } = {};
    await Object.keys(this.schemas).forEach(async (key: string) => {
      schemasCopy[key] = await this.schemas[key];
    });
    return schemasCopy;
  }

  addSchema(schema: JSONSchema6forRdf): void {
    const uri = this.sparqlGen.abbreviateIri(schema['@id']);
    if (!this.schemas[uri]) this.schemas[uri] = schema;
    //const ajv = new Ajv({ allErrors: true });
    //schemaValidators[schema['@id']] = ajv.compile(schema);
  }

  async findDirectSubSchemas(parentSchemaUri: string): Promise<JSONSchema6forRdf[]> {
    const foundSchemas: JSONSchema6forRdf[] = [];
    await Object.keys(this.schemas).forEach(async (uri: string) => {
      const schema = await this.schemas[uri];
      if (schema.allOf) {
        schema.allOf.forEach((e) => {
          if ((e as any).$ref === parentSchemaUri) foundSchemas.push(schema);
        });
      }
    });
    return foundSchemas;
  }

  async findAllSuperSchemas(uri: string): Promise<JSONSchema6forRdf[]> {
    //console.log('getSchemaByUri', { uri });
    const schemaQueue: JSONSchema6forRdf[] = [];
    const schemaTmpQueue: JSONSchema6forRdf[] = [];
    let schemaAllOf: JSONSchema6Definition[];
    let schemaParents: JSONSchema6forRdf[];
    let schema: JSONSchema6forRdf;
    let schemaOrUndefined: JSONSchema6forRdf | undefined;
    schema = await this.getSchemaByUriInternal(uri);
    //console.log('getSchemaByUri schema', { uri, schema });
    schemaTmpQueue.push(schema);
    while (schemaTmpQueue.length > 0) {
      schemaOrUndefined = schemaTmpQueue.shift();
      if (schemaOrUndefined !== undefined) {
        schema = schemaOrUndefined;
        if (schema.allOf) {
          schemaAllOf = schema.allOf.filter((s1: any) => s1.$ref !== undefined);
          //console.log('getSchemaByUri allOf', { uri, schema, schemaAllOf });
          // eslint-disable-next-line no-await-in-loop
          schemaParents = await Promise.all(schemaAllOf.map((s2: any) => this.getSchemaByUriInternal(s2.$ref)));
          schemaTmpQueue.push(...schemaParents);
        }
        schemaQueue.push(schema);
      }
    }
    return schemaQueue;
  }

  async getAllProperties(schemaUri: string): Promise<[{ [key: string]: JSONSchema6DefinitionForRdfProperty }, {}]> {
    let schema = await this.getSchemaByUri(schemaUri);
    const foundSchemas: JSONSchema6forRdf[] = [schema];

    for (let index = 0; index < foundSchemas.length; index++) {
      schema = foundSchemas[index];
      const uri = schema['@type'];
      if (uri) {
        const subSchemas = await this.findDirectSubSchemas(uri);
        copyUniqueArrayElements(foundSchemas, subSchemas);
      }
    }
    return allProsFromSchemas(foundSchemas);
  }

  validate(schema: JSONSchema6forRdf, artifact: any): void {
    const artifactValidator = this.schemaValidators[schema['@id']];
    if (artifactValidator) {
      if (!artifactValidator(artifact)) {
        console.error('VALIDATION ERROR', artifactValidator.errors);
        console.info('invalid artifact', artifact);
        throw new Ajv.ValidationError(artifactValidator.errors);
      }
    }
  }

  async specializeSchema(schema: JSONSchema6forRdf, data: any): Promise<JSONSchema6forRdf> {
    const tp = data['@type'];
    if (tp) {
      const sch = await this.getSchemaByUri(tp);
      if (sch) {
        return sch;
      }
    }
    return schema;
  }

  graphRouter(/*schema: JSONSchema6forRdf, data: any, query: string*/): string | undefined {
    //if (schema['@id'] === 'nav:folder') {
    //  return foldersGraphUri;
    //}
    //if (query.startsWith('select') || query.startsWith('update')) {
    return undefined;
    //}
    //return graphUri;
  }

  nsRouter(schema: JSONSchema6forRdf): string {
    const individualNamespace = schema.defaultIndividNs || 'http://cpgu.kbpm.ru/ns/rm/rdf#';
    return individualNamespace;
  }

  async selectObjectsInternal(
    schema: JSONSchema6forRdf,
    //conditions: any,
    queryConstructor: () => string,
    objectConstructor: (bindings: Bindings) => JsObject,
  ): Promise<JsObject[]> {
    const query = queryConstructor();
    const results = await this.client.sparqlSelect(query);
    //console.debug(() => `selectObjectsInternal results=${json2str(results)}`);
    // Map bindings
    let objects = results.bindings.map(objectConstructor);
    //console.debug(() => `selectObjectsInternal objects=${json2str(objects)}`);
    //objects.forEach((artifact) => this.convertToInternal(schema, artifact));
    //console.debug(() => `selectObjectsInternal objectsInternal=${json2str(objects)}`);
    //make arrays from objects with the same uri
    objects = createObjectWithoutRepetitions(objects, schema);
    //console.debug(() => `selectObjectsInternal objects_with_arrays=${json2str(objects)}`);
    return objects;
  }

  /**
   * Возвращает полученный с сервера набор JSON объектов определенного типа со значениями полей, соответствующий JSON Schema + JSON-LD
   * ограничениям и дополнительным условиям на значения объектов из conditions.
   * Дополнительно запрашивает конечный тип объекта (самый "нижний" / специфичный в иерархии наследования).
   * Особым образом обрабатывает поля-массивы.
   *
   * @param schemaOrString -- JSON схема с JSON-LD информацией об RDF классе и определениями RDF свойств
   *  - Упрощенная JSON Schema (только URI) `'rm:Artifact'` -- выбираются значения всех поля объекта из этой схемы и родительских
   * схем объекта
   *  - Подробное перечисление полей вывода позволяет выбирать для объкта ограниченное число полей и их значений
   *   ```
   *   {
   *     '@id': 'rm:Artifact',
   *     properties: {
   *       prop: ...,
   *     },
   *   }
   *   ```
   * @param conditions -- хэшмап поле-значение для условной выборки. Ключ -- ключ поля из JSON Schema. Значение может содержать простые
   * значения или более сложные функции-условия
   */
  async selectObjectsWithTypeInfo(
    schemaOrString: JSONSchema6forRdf | string,
    conditions: any = {},
  ): Promise<JsObject[]> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const schemaPropsWithoutArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
    const schemaPropsWithArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
    const conditionsWithoutArrays: any = {};
    const conditionsWithArrays: any = {};
    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        if (schema.properties) {
          if (schema.properties[key].type === 'array') {
            schemaPropsWithArrays[key] = schema.properties[key];
            if (conditions[key]) conditionsWithArrays[key] = conditions[key];
          } else {
            schemaPropsWithoutArrays[key] = schema.properties[key];
            if (conditions[key]) conditionsWithoutArrays[key] = conditions[key];
          }
        }
      });
    }
    //console.debug(() => `selectObjects conditionsWithArrays=${json2str(conditionsWithArrays)}`);
    //console.debug(() => `selectObjects schemaPropsWithArrays=${json2str(schemaPropsWithArrays)}`);
    //console.debug(() => `selectObjects conditionsWithoutArrays=${json2str(conditionsWithoutArrays)}`);
    //console.debug(() => `selectObjects schemaPropsWithoutArrays=${json2str(schemaPropsWithoutArrays)}`);
    const schemaWithoutArrays = {
      ...schema,
      properties: schemaPropsWithoutArrays,
    };
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    const objects = await this.selectObjectsInternal(
      schemaWithoutArrays,
      () => {
        sparqlGen.addSparqlShape(schemaWithoutArrays, conditionsWithoutArrays);
        sparqlGen.shapes[0].variables['@type'] = schemaWithoutArrays.properties['@type'];
        addprops2vars2props(sparqlGen.shapes[0], '@type', 'type0');
        sparqlGen.selectObjectsWithTypeInfoQuery();
        //console.debug(() => `selectObjects query=${json2str(sparqlGen.query)}`);
        return sparqlGen.stringify();
      },
      (bindings) => sparqlGen.sparqlBindingsToObjectProp(bindings),
    );
    //process array properties
    await this.selectObjectsArrayProperties(schema, schemaPropsWithArrays, objects);
    //console.debug(() => `selectObjects objects_with_arrays=${json2str(objects)}`);
    return objects;
  }

  async selectObjects(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}): Promise<JsObject[]> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const schemaPropsWithoutArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
    const schemaPropsWithArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
    const conditionsWithoutArrays: any = {};
    const conditionsWithArrays: any = {};
    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        if (schema.properties) {
          if (schema.properties[key].type === 'array') {
            schemaPropsWithArrays[key] = schema.properties[key];
            if (conditions[key]) conditionsWithArrays[key] = conditions[key];
          } else {
            schemaPropsWithoutArrays[key] = schema.properties[key];
            if (conditions[key]) conditionsWithoutArrays[key] = conditions[key];
          }
        }
      });
    }
    //console.debug(() => `selectObjects conditionsWithArrays=${json2str(conditionsWithArrays)}`);
    //console.debug(() => `selectObjects schemaPropsWithArrays=${json2str(schemaPropsWithArrays)}`);
    //console.debug(() => `selectObjects conditionsWithoutArrays=${json2str(conditionsWithoutArrays)}`);
    //console.debug(() => `selectObjects schemaPropsWithoutArrays=${json2str(schemaPropsWithoutArrays)}`);
    const schemaWithoutArrays = {
      ...schema,
      properties: schemaPropsWithoutArrays,
    };
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    const objects = await this.selectObjectsInternal(
      schemaWithoutArrays,
      () => {
        sparqlGen.addSparqlShape(schemaWithoutArrays, conditionsWithoutArrays);
        //sparqlGen.shapes[0].variables['@type'] = schemaWithoutArrays['@type'];
        //addprops2vars2props(sparqlGen.shapes[0], '@type', 'type0');
        sparqlGen.selectObjectsQuery();
        //console.debug(() => `selectObjects query=${json2str(sparqlGen.query)}`);
        return sparqlGen.stringify();
      },
      (bindings) => sparqlGen.sparqlBindingsToObjectProp(bindings),
    );
    //process array properties
    await this.selectObjectsArrayProperties(schema, schemaPropsWithArrays, objects);
    //console.debug(() => `selectObjects objects_with_arrays=${json2str(objects)}`);
    return objects;
  }

  /**
   *
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param conditions
   */
  async selectDataType(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}): Promise<JsObject[]> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    //console.debug(() => `selectDataType conditions=${json2str(conditions)}`);
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    const result = await this.selectObjectsInternal(
      schema,
      () => {
        sparqlGen.addSparqlShape(schema, conditions).selectObjectsQuery();
        //console.debug(() => `selectDataType query=${json2str(sparqlGen.query)}`);
        return sparqlGen.stringify();
      },
      (bindings) => sparqlGen.sparqlBindingsToObjectProp(bindings),
    );
    //console.debug(() => `selectDataType result_with_arrays=${json2str(result)}`);
    return result;
  }

  /**
   * Находит объекты заданного типа по значениям полей других объектов (например, ссылкам на них).
   * Другие объекты тоже ищутся по заданному типу и набору значений полей
   * Алгоритм работы:
   * 1. Находит все объекты по типу из refSchema условию refsConditions
   * 2. Формирует новые условия на основе resultToRefMapping, где ключи = имена полей
   * в схеме resultSchema, значения = имена полей в схеме refSchema, значения которых берутся для условия
   * 3. Находит все объекты по типу resultToRefMapping и новым условиям из маппинга
   * @param refSchema -- JSON схема связи (reference) с RDF классоми и определениями RDF свойств
   * @param resultSchema -- JSON схема искомого объекта с RDF классоми и определениями RDF свойств
   * @param refsConditions -- поля объкта связи (у которого реф-схема) для задания условия поиска
   * @param resultToRefMapping -- набор полей, где ключи -- имена полей искомых конечных объектов, а значения
   *  -- это имена полей в найденных объектах связей, значения которых должны быть в найденных конечных объектах
   */
  async selectObjectsByObjRefs(
    refSchemaOrString: JSONSchema6forRdf | string,
    resultSchemaOrString: JSONSchema6forRdf | string,
    refsConditions: any = {},
    resultToRefMapping: any = {},
  ): Promise<JsObject[]> {
    const refSchema: JSONSchema6forRdf =
      typeof refSchemaOrString === 'string' ? await this.getSchemaByUri(refSchemaOrString) : refSchemaOrString;
    const resultSchema: JSONSchema6forRdf =
      typeof resultSchemaOrString === 'string' ? await this.getSchemaByUri(resultSchemaOrString) : resultSchemaOrString;
    const referencingObjects = await this.selectObjects(refSchema, refsConditions);
    //console.log('referencingObjects', referencingObjects);
    //console.log('resultToRefMapping', resultToRefMapping);
    // Map bindings
    let ret: any[] = [];
    for (let i = 0; i < referencingObjects.length; i++) {
      const ref = referencingObjects[i];
      //console.log('ref', ref);
      const conditions: any = {};
      for (const key in resultToRefMapping) {
        //console.log('key', key);
        //console.log('resultToRefMapping.key', resultToRefMapping[key]);
        //console.log('ref[resultToRefMapping.key]', ref[resultToRefMapping[key]]);
        conditions[key] = ref[resultToRefMapping[key]];
      }
      //console.debug(() => `selectObjectsByObjRefs conditions=${conditions}`);
      const results = await this.selectObjects(resultSchema, conditions);
      //console.debug(() => `selectObjectsByObjRefs results=${results}`);
      if (results.length > 0) {
        ret = ret.concat(results);
      }
    }
    //console.debug(() => `selectObjectsByObjRefs ret=${json2str(ret)}`);
    return ret;
  }

  /**
   * Заменяет
   * @param obj
   */
  // eslint-disable-next-line class-methods-use-this
  async selectObjectsArrayProperties(
    schemaOrString: JSONSchema6forRdf | string,
    schemaPropsWithArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty },
    objects: JsObject[],
  ): Promise<JsObject[]> {
    if (Object.keys(schemaPropsWithArrays).length > 0) {
      const schema: JSONSchema6forRdf =
        typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
      const anyContext = schema['@context'];
      const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
      for (const object of objects) {
        for (const key of Object.keys(schemaPropsWithArrays)) {
          const schemaWithArrayProperty: JSONSchema6forRdf = {
            ...schema,
          };
          schemaWithArrayProperty.properties = {};
          const prop = schemaPropsWithArrays[key];
          schemaWithArrayProperty.properties[key] = prop;
          schemaWithArrayProperty.required = ['@id', key];
          const propType = getSchemaPropType(schemaWithArrayProperty.properties, context, key);

          if (prop && prop.type && propType) {
            let schemaUri: string | undefined = undefined;
            if (prop.type === 'array' && prop.items) {
              schemaUri = propType;
            } else if (prop.type === 'object') {
              schemaUri = propType;
            } else if (prop.type === 'string' && prop.format === 'iri') {
              schemaUri = propType;
            }
            if (schemaUri) {
              const schema2 = await this.getSchemaByUri(schemaUri);
              let queryPrefixes = await this.getQueryPrefixes();
              const sparqlGen = new SparqlGen(queryPrefixes);
              sparqlGen.addSparqlShape(schemaWithArrayProperty, { '@id': object['@id'] }).addSparqlShape(schema2);

              const query = sparqlGen.selectObjectsQuery().stringify();
              //console.debug(() => `selectObjectsArrayProperties query=${query}`);
              const selectResults = await this.client.sparqlSelect(query);
              //console.debug(() => `selectObjectsArrayProperties results=${json2str(selectResults)}`);

              const objects = selectResults.bindings.map((bindings) => {
                if (schemaUri) return sparqlGen.sparqlBindingsToObjectBySchemaIri(bindings, schemaUri);
                else return {};
              });
              //console.debug(() => `selectObjectsInternal objects=${json2str(objects)}`);
              //objects.forEach((artifact) => this.convertToInternal(schema2, artifact));
              //console.debug(() => `selectObjectsInternal objectsInternal=${json2str(objects)}`);
              //make arrays from objects with the same uri
              //objects = createObjectWithoutRepetitions(objects, schema);
              object[key] = objects;
            }
          }
        }
      }
    }
    return objects;
  }

  /**
   * Находит один объект по его идентификатору (численному полю identifier)
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param id
   */
  async selectObjectById(schemaOrString: JSONSchema6forRdf | string, id: number): Promise<void | JsObject> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const conditions: any = {
      identifier: Math.floor(id),
    };
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions);
    if (schema.properties) {
      sparqlGen.shapes[0].variables['@type'] = schema.properties['@type'];
      addprops2vars2props(sparqlGen.shapes[0], '@type', 'type0');
    }
    sparqlGen.selectObjectsWithTypeInfoQuery().limit(1);
    const query = sparqlGen.stringify();
    const results = await this.client.sparqlSelect(query);
    // Map bindings
    const result = results.bindings.map((binding) => sparqlGen.sparqlBindingsToObjectProp(binding));
    result.forEach((artifact) => {
      artifact.identifier = id;
      //this.convertToInternal(schema, artifact);
    });
    if (result.length > 0) return result[0];
    Promise.reject('Cannot assign new ID to new artifact');
  }

  /**
   *
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   */
  async selectMaxObjectId(schemaOrString: JSONSchema6forRdf | string): Promise<number> {
    //console.log('selectMaxObjectId');
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const order = [{ expression: variable('identifier0'), descending: true }];
    if (schema.properties) {
      const variables = {
        identifier: schema.properties.identifier,
      };
      let queryPrefixes = await this.getQueryPrefixes();
      const sparqlGen = new SparqlGen(queryPrefixes);
      sparqlGen
        .addSparqlShape(schema, {}, variables)
        //.selectObjectsWithTypeInfoQuery()
        .selectObjectsQuery()
        .limit(1)
        .orderBy(order);
      const query = sparqlGen.stringify();
      //console.log('selectMaxObjectId query=', query);
      const results = await this.client.sparqlSelect(query);
      if (results.bindings.length === 0) {
        //console.log('selectMaxObjectId return 0');
        return 0;
      }
      //console.log('selectMaxObjectId results.bindings[0]=', results.bindings[0]);
      const req = sparqlGen.sparqlBindingsToObjectProp(results.bindings[0]);
      //console.log(`selectMaxObjectId bindingToObject.req=${json2str(req)}`);
      return req.identifier as number;
    }
    //console.log('selectMaxObjectId error, return 0');
    return 0 as any; //Promise.reject(new Error('Error in max id retrieving'));
  }

  /**
   *
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   */
  async selectMaxObjectNumField(
    schemaOrString: JSONSchema6forRdf | string,
    conditions: any = {},
    field = 'identifier',
  ): Promise<any> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const order = [{ expression: variable(field), descending: true }];
    if (schema.properties) {
      const variables = { identifier: schema.properties.identifier };
      let queryPrefixes = await this.getQueryPrefixes();
      const sparqlGen = new SparqlGen(queryPrefixes);
      sparqlGen
        .addSparqlShape(schema, conditions, variables)
        .selectObjectsWithTypeInfoQuery()
        .limit(1)
        .orderBy(order);

      /*const queryObj = this.sparqlGen.generateQueryObj(schema, conditions, variables, 1, order);
      if (queryObj.where) {
        const bgp = queryObj.where.find((whereItem: any) => whereItem.type === 'bgp');
        if (bgp) {
          bgp.triples.unshift({
            subject: this.sparqlGen.genShapeSparqlSubject(conditions['@id']),
            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            object: this.sparqlGen.getPredicate(schema['@id']),
          });
        } else {
          queryObj.where.unshift({
            type: 'bgp',
            triples: [
              {
                subject: this.sparqlGen.genShapeSparqlSubject(conditions['@id']),
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: this.sparqlGen.getPredicate(schema['@id']),
              },
            ],
          });
        }
      }*/
      const query = sparqlGen.stringify();
      const results = await this.client.sparqlSelect(query);
      //console.trace(() => `selectMaxObjectNumField res=${results}`);
      if (results.bindings.length === 0) return 0;
      //console.log('res.results.bindings[0]=', res.results.bindings[0]);
      const req = sparqlGen.sparqlBindingsToObjectProp(results.bindings[0]);
      //console.debug(() => `selectMaxObjectNumField req=${json2str(req)}`);
      return req[field];
    }
  }

  /**
   * Создает объект в соответствии с классом из schema и значениями полей из data
   * URI генерируется автоматически
   * Текущий пользователь и текущее время устанавливаются как создатель и автор изменений, время создания и изменения
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param data -- объект с данными для создания и сохранения
   */
  async createObject(schemaOrString: JSONSchema6forRdf | string, data: any): Promise<JsObject> {
    //console.log('createObject data=', data);
    let schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    // специализируем схему на основе поля type
    schema = await this.specializeSchema(schema, data);
    if (schema.properties) {
      let queryPrefixes = await this.getQueryPrefixes();
      const sparqlGen = new SparqlGen(queryPrefixes);
      const now = moment().toISOString();
      const merged: JsObject = {
        '@id': sparqlGen.abbreviateIri(sparqlGen.deAbbreviateIri(this.nsRouter(schema)) + '_' + uuid62.v4()),
        created: now,
        creator: this.user,
        modified: now,
        modifiedBy: this.user,
        processArea: this.processArea,
        ...data,
      };
      Object.keys(merged).forEach((k) => {
        if (!merged[k]) delete merged[k];
      });
      //const graph = graphRouter(schema, data, 'createObject');
      // создем по необходимости id
      if (schema.properties && schema.properties.identifier) {
        if (merged.identifier === undefined) {
          const parentSchema = await this.getSchemaByUri('rm:Artifact');
          //console.log('parentSchema', parentSchema);
          const id = await this.selectMaxObjectId(parentSchema);
          //console.log('id', id);
          merged.identifier = id + 1;
          //console.log('merged.identifier', merged.identifier);
        }
      }
      sparqlGen.addSparqlShape(schema, {}, {}, merged).insertObjectQuery();
      const query = sparqlGen.stringify();
      //console.log('createObject url=' + ' query=' + query);
      await this.client.sparqlUpdate(query);
      //console.log('createObject merged=', merged);
      return merged;
    }
    //console.log('createObject Create artifact. Schema without properties');
    return Promise.reject('Cannot Create artifact. Schema without properties');
  }

  /**
   * Обновляет конкретные поля с конкретными старыми значениями на новые значения. Через добавление и удаление триплов.
   * При обновлении полей объекта, поля со старыми значениями должны быть в объекте conditions, а поля с новыми значениями -- в объекте data.
   * Удаляет все значения полей с такими же URI, но другими значениями (т.е. при кратности > 1).
   * В дальнейшем можно добавить проверку кратности > 1 в схеме и обновление только конкретных значений.
   * @param schema -- JSON схема с RDF классом и определениями RDF свойств
   * @param conditions -- исходный объект со всеми полями и их значениями (старыми) и URI для поиска
   * @param data -- только изменяемые поля с новыми значениями в соответствии со схемой
   */
  async updateObject(schemaOrString: JSONSchema6forRdf | string, conditions: any, data: any): Promise<JsObject> {
    let schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    const merged: JsObject = {
      ...data,
      modified: moment().toISOString(),
      modifiedBy: this.user,
    };
    if (merged['@id'] === undefined && conditions['@id'] !== undefined) {
      merged['@id'] = conditions['@id'];
    }
    schema = await this.specializeSchema(schema, merged);
    //const graph = this.graphRouter(schema, merged, 'updateObject');
    Object.keys(conditions).forEach((k) => {
      if (!conditions[k]) delete conditions[k];
    });
    Object.keys(merged).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions, {}, merged).updateObjectQuery();
    const query = sparqlGen.stringify();
    //console.log(`updateObject query=${query}`);
    await this.client.sparqlUpdate(query);
    return merged;
  }

  /**
   * Удаляет ВСЕ триплы для заданного URI, соответствующего набору значений полей из conditions
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param conditions -- объект с полями для условия поиска
   */
  async deleteObject(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<void> {
    let schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    schema = await this.specializeSchema(schema, conditions);
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions);
    sparqlGen.deleteObjectQuery();
    const query = sparqlGen.stringify();
    console.debug(() => `deleteObject query=${query}`);
    await this.client.sparqlUpdate(query);
  }

  /**
   * Select all custom artifact types.
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param url the repository URL
   * SELECT ?uri ?title
   * WHERE {
   *   ?uri rdfs:subClassOf rm:Artifact .
   *   ?uri dcterms:title ?title .
   * }
   */
  async selectSubclasses(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}): Promise<JsObject[]> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
      let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen
      .addSparqlShape(schema, conditions)
      .createSelect()
      .addToWhereBgpTriple(
        /*triple(
          sparqlGen.shapes[0].subj,
          sparqlGen.getFullIriNamedNode('rdfs:subClassOf'),
          sparqlGen.getFullIriNamedNode(schema['@id']),
        ),*/
        {
          subject: sparqlGen.shapes[0].subj,
          predicate: {
            type: 'path',
            pathType: '*',
            items: [namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf')],
          },
          object: sparqlGen.getFullIriNamedNode(schema['@id']),
        },
      );

    const query = sparqlGen.stringify();
    //console.debug(() => `selectSubclasses query=${query}`);
    const results = await this.client.sparqlSelect(query);
    // Map bindings
    const result = results.bindings.map((binding: any) => sparqlGen.sparqlBindingsToObjectProp(binding));
    //result.forEach((artifact: any) => this.convertToInternal(schema, artifact));
    //console.log('Result', result);
    return result;
  }

  /**
   * Select all parent classes, include class and Resource
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param conditions
   * SELECT ?class WHERE {
   *   cpgu:Classifier rdfs:subClassOf+ ?class .
   * }
   */
  async selectSuperClasses(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}): Promise<string[]> {
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions);
    sparqlGen.shapes[0].variables.superClass = 'superClass';
    sparqlGen.createSelect().addToWhereBgpTriple(
      triple(
        sparqlGen.shapes[0].subj,
        {
          type: 'path',
          pathType: '+',
          items: [
            {
              termType: 'NamedNode',
              value: 'http://www.w3.org/2000/01/rdf-schema#subClassOf',
            },
          ],
        },
        variable('superClass'),
      ),
    );

    const query = sparqlGen.stringify();
    //console.debug(() => `selectSuperClasses query=${query}`);
    const results = await this.client.sparqlSelect(query);
    // Map bindings
    const result = results.bindings.map((binding) => sparqlGen.abbreviateIri(binding.superClass.value));
    //result.forEach((artifact: any) => this.convertToInternal(schema, artifact));
    //console.log('Result', result);
    return result;
  }

  /**
   * Select direct parent classes, include Resource
   * @param schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param conditions
   * SELECT ?class WHERE {
   *   cpgu:Classifier rdfs:subClassOf ?class .
   * }
   */
  async selectDirectSuperClasses(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}): Promise<string[]> {
    //console.log('selectDirectSuperClasses', { schemaOrString, conditions });
    const schema: JSONSchema6forRdf =
      typeof schemaOrString === 'string' ? await this.getSchemaByUri(schemaOrString) : schemaOrString;
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions);
    sparqlGen.shapes[0].variables.superClass = 'superClass';
    sparqlGen
      .createSelect()
      .addToWhereBgpTriple(
        triple(sparqlGen.shapes[0].subj, sparqlGen.getFullIriNamedNode('rdfs:subClassOf'), variable('superClass')),
      );

    const query = sparqlGen.stringify();
    //console.debug(() => `selectSuperClasses query=${query}`);
    const results = await this.client.sparqlSelect(query, { infer: 'false' });
    // Map bindings
    const result = results.bindings.map((binding) => sparqlGen.abbreviateIri(binding.superClass.value));
    //result.forEach((artifact: any) => this.convertToInternal(schema, artifact));
    //console.log('Result', result);
    //console.log('selectDirectSuperClasses END', { schemaOrString, conditions, result });
    return result;
  }

  //TODO: conditions['@id'], 'classShape'
  async selectProperties(schema: any, conditions: any = {}): Promise<JsObject[]> {
    let queryPrefixes = await this.getQueryPrefixes();
    const sparqlGen = new SparqlGen(queryPrefixes);
    sparqlGen.addSparqlShape(schema, conditions);
    //const subj = sparqlGen.shapes[0].subj;
    sparqlGen
      .createSelect()
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'classShape'),
          sparqlGen.getFullIriNamedNode('sh:property'),
          variable('@id'),
        ),
      )
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'classShape'),
          sparqlGen.getFullIriNamedNode('sh:targetClass'),
          variable('superClass'),
        ),
      )
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'classShape'),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          sparqlGen.getFullIriNamedNode('sh:NodeShape'),
        ),
      )
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'schema'),
          sparqlGen.getFullIriNamedNode('rdfs:subClassOf'),
          variable('superClass'),
        ),
      )
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'schema'),
          sparqlGen.getFullIriNamedNode('dcterms:title'),
          variable('Title'),
        ),
      )
      .addToWhereBgpTriple(
        triple(
          sparqlGen.genShapeSparqlSubject(conditions['@id'], 'schema'),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          sparqlGen.getFullIriNamedNode('rdfs:Class'),
        ),
      );
    sparqlGen.query.variables.unshift(variable('schema'), variable('@id'));

    const query = sparqlGen.stringify();
    //console.debug(() => `selectProperties query=${query}`);
    const results = await this.client.sparqlSelect(query);
    // Map bindings
    const result = results.bindings.map((binding: any) => sparqlGen.sparqlBindingsToObjectProp(binding));
    //console.debug(() => `GLOBAL SCHEMA result=${result}`);
    //result.forEach((artifact: any) => this.convertToInternal(schema, artifact));
    //make arrays from objects with the same uri
    //const props = groupBySchema(result, schema);
    //console.debug(() => `GLOBAL SCHEMA props=${props}`);
    //this.setSchemas(props);
    //console.log('GLOBAL SCHEMA', this.schemas);
    //console.debug(() => `GLOBAL SCHEMA schemas=${this.schemas}`);
    return result;
  }

  //selectAttributeTypes(url: string) {}
  //selectObjectTypes(url: string) {}

  async createSubclass(/*schemaOrString: JSONSchema6forRdf | string, conditions: any*/): Promise<any> {
    return {};
  }
  async updateSubclass(/*schemaOrString: JSONSchema6forRdf | string, conditions: any*/): Promise<any> {
    return {};
  }
  async deleteSubclass(/*schemaOrString: JSONSchema6forRdf | string, conditions: any*/): Promise<any> {
    return {};
  }

  /**
   * Select all custom artifact type's system attributes.
   * @param {string} url the repository URL
   */
  //selectArtifactTypeSystemAttributes(url: string, id: number) {}
  /*    const query = `
    SELECT ?id ?attribute ?attributeTitle ?attributeDescription
    WHERE {
      ?id a rm:ObjectType .
      ?id rm:defaultFormat <${id}> .
      ?id rm:hasSystemAttribute ?attribute .
      ?attribute dcterms:title ?attributeTitle .
      ?attribute dcterms:description ?attributeDescription .
    }`;
    const res = await executeSelect(url, query);
    const ret = res.results.bindings.map((binding) => ({
      id: binding.id.value,
      attribute: binding.attribute.value,
      attributeTitle: binding.attributeTitle.value,
      attributeDescription: binding.attributeDescription.value,
    }));
    return ret;
}*/

  /**
   * Select all custom artifact type's custom attributes.
   * @param url the repository URL
   */
  //selectArtifactTypeCustomAttributes(url: string, id: number) {}
  /*    const query = `
    SELECT ?id ?attribute ?attributeTitle ?attributeDescription
    WHERE {
      ?id a rm:ObjectType .
      ?id rm:defaultFormat <${id}> .
      ?id rm:hasAttribute ?attribute .
      ?attribute dcterms:title ?attributeTitle .
      ?attribute dcterms:description ?attributeDescription .
    }`;
    const res = await executeSelect(url, query);
    const ret = res.results.bindings.map((binding) => ({
      id: binding.id.value,
      attribute: binding.attribute.value,
      attributeTitle: binding.attributeTitle.value,
      attributeDescription: binding.attributeDescription.value,
    }));
    return ret;
  }*/
}
