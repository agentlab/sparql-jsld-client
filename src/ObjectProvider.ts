import { JSONSchema6 } from 'json-schema';
import { SparqlClient } from './SparqlClient';

export function json2str(data: any): string {
  if (data) return JSON.stringify(data, null, 2);
  return data;
}

export interface JsObject {
  [key: string]: any;
}

export interface QueryShape {
  '@id'?: string;
  '@type'?: string;
  // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  schema: string | JSONSchema6forRdf; // could be class IRI, resolved from local schema reposiory (local cache) or from server
  conditions?: JsObject;
  variables?: JsObject;
  data?: JsObject;
}

export interface Query {
  '@id'?: string;
  '@type'?: string;
  // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  shapes: QueryShape[];
  orderBy?: string; // if last digit not specified, we assuming '0' (identifier0)
  limit?: number;
  offset?: number;
}

export function idComparator(a: JsObject, b: JsObject): number {
  const nameA = a['@id'].toLowerCase(),
    nameB = b['@id'].toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
}

export type JSONSchema6DefinitionForRdfProperty = JSONSchema6forRdfProperty;
export interface JSONSchema6forRdfProperty extends JSONSchema6 {
  //uri: string;
  //formatters?: { [key: string]: (value: any) => any };

  /**
   * json-ld Property
   * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
   */
  '@id'?: string;
  '@type'?: string;

  valueModifiability?: string; // user or non -- system
  shapeModifiability?: string; // user or non -- system

  properties?: {
    [key: string]: JSONSchema6DefinitionForRdfProperty;
  };
}

export type JSONSchema6DefinitionForRdf = JSONSchema6forRdf;
export interface JSONSchema6forRdf extends JSONSchema6, JsObject {
  //uri: string;
  //formatField?: (field: JSONSchema6DefinitionForRdfProperty, value: any, format?: string) => any;

  /**
   * json-ld Node
   * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
   */
  '@context'?: {}; // json-ld
  '@id': string; // json-ld
  //'@included' // json-ld
  //'@graph'?: [] | {}; // json-ld
  //'@nest' // json-ld
  '@type'?: string; // json-ld
  //'@reverse'
  //'@index'

  //inCreationMenu?: boolean;
  //defaultFormat?: string;
  //iconReference?: string;

  properties?: {
    [key: string]: JSONSchema6DefinitionForRdfProperty;
  };
}

export function copyObjectProps(objTo: JsObject, objFrom: JsObject): void {
  Object.keys(objFrom).forEach((objFromKey) => {
    objTo[objFromKey] = objFrom[objFromKey];
  });
}

export function copyUniqueObjectProps(objTo: JsObject, objFrom: JsObject): void {
  Object.keys(objFrom).forEach((objFromKey) => {
    if (objTo[objFromKey] === undefined) {
      objTo[objFromKey] = objFrom[objFromKey];
    }
  });
}

export function copyUniqueObjectPropsWithRenameOrFilter(
  objTo: JsObject,
  objFrom: JsObject,
  renameOrFilter: JsObject,
): void {
  Object.keys(objFrom).forEach((objFromKey) => {
    if (objTo[objFromKey] === undefined) {
      const rof = renameOrFilter[objFromKey];
      //copy if not found
      if (rof === undefined) objTo[objFromKey] = objFrom[objFromKey];
      // rename if found not null string
      else if (rof !== null && typeof rof === 'string') objTo[rof] = objFrom[objFromKey];
      // ignore if null
    }
  });
}

export function copyObjectPropsWithRenameOrFilter(obj: JsObject, renameOrFilter: JsObject): JsObject {
  const result: JsObject = {};
  Object.keys(obj).forEach((propKey) => {
    const rof = renameOrFilter[propKey];
    //copy if not found
    if (rof === undefined) result[propKey] = obj[propKey];
    // rename if found not null string
    else if (rof !== null && typeof rof === 'string') result[rof] = obj[propKey];
    // ignore if null
  });
  return result;
}

export function copyUniqueArrayElements(arrTo: any[], arrFrom: any[]): void {
  arrFrom.forEach((element) => {
    if (!arrTo.includes(element)) {
      arrTo.push(element);
    }
  });
}

export function getPropKeysByFormat(schema: JSONSchema6forRdf, format: string): string[] {
  const props: string[] = [];
  for (const key in schema.properties) {
    if (schema.properties[key].format === format) {
      props.push(key);
    }
  }
  return props;
}

/**
 * ObjectProvider Responsibilities:
 * Дополнение недоопределенной JSON Schema
 * Разрешение композитной JSON Schema
 * Начальное получение JSON Schemas с сервера и ведение их реестра
 * Обновление JSON Schemas при изменении их на сервере
 * Дополнение запросов дополнительной семантикой rdf триплстора
 *  * Доп параметры RDF4J REST API (например, include inferred)
 *  * "Роутинг" данных между RDF графами (в какие графы какие данные сохранять, откуда удалять)
 */
export interface ObjectProvider {
  setClient(client: SparqlClient): void;
  getClient(): SparqlClient;

  getQueryPrefixes(): Promise<{ [s: string]: string }>;
  setQueryPrefixes(queryPrefixes: { [s: string]: string }): void;
  reloadQueryPrefixes(): Promise<void>;
  abbreviateIri(fillQualifiedIri: string): string;
  deAbbreviateIri(abbreviatedIri: string): string;

  setUser(user: string): void;
  getUser(): string;

  getSchemaByUri(uri: string): Promise<JSONSchema6forRdf>;

  getSchemas(): Promise<{ [key: string]: JSONSchema6forRdf }>;
  getAllProperties(uri: string): Promise<[{ [key: string]: JSONSchema6DefinitionForRdfProperty }, {}]>;

  /**
   * @param {object} schema -- JSON схема с RDF классоми и определениями RDF свойств
   */
  addSchema(schema: JSONSchema6forRdf): void;

  getUiSchemaByUri(uri: string): Promise<JsObject>;
  /**
   * @param {object} schema -- JSON схема с RDF классоми и определениями RDF свойств
   * @param {object} artifact -- объект для валидации
   */
  validate(schema: JSONSchema6forRdf, artifact: any): void;

  selectDataType(schemaOrString: JSONSchema6forRdf | string): Promise<JsObject[]>;
  selectDataType(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<JsObject[]>;

  selectObjects(schemaOrString: JSONSchema6forRdf | string): Promise<JsObject[]>;
  selectObjects(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<JsObject[]>;

  selectObjectsWithTypeInfo(schemaOrString: JSONSchema6forRdf | string): Promise<JsObject[]>;
  selectObjectsWithTypeInfo(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<JsObject[]>;

  selectObjectsByQuery(query: Query): Promise<JsObject[]>;

  selectObjectById(schemaOrString: JSONSchema6forRdf | string, id: number): Promise<void | JsObject>;
  selectMaxObjectId(schemaOrString: JSONSchema6forRdf | string): Promise<number>;

  selectObjectsByObjRefs(
    refSchemaOrString: JSONSchema6forRdf | string,
    resultSchemaOrString: JSONSchema6forRdf | string,
    refsConditions?: any,
    resultToRefMapping?: any,
  ): Promise<JsObject[]>;

  selectMaxObjectNumField(schemaOrString: JSONSchema6forRdf | string): Promise<any>;
  selectMaxObjectNumField(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<any>;
  selectMaxObjectNumField(schemaOrString: JSONSchema6forRdf | string, conditions: any, field: string): Promise<any>;

  createObject(schemaOrString: JSONSchema6forRdf | string, data: any): Promise<JsObject>;
  updateObject(schemaOrString: JSONSchema6forRdf | string, conditions: any, data: any): Promise<JsObject>;
  deleteObject(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<void>;

  selectSubclasses(schemaOrString: JSONSchema6forRdf | string): Promise<JsObject[]>;
  selectSubclasses(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<JsObject[]>;

  selectProperties(schemaOrString: JSONSchema6forRdf | string): Promise<JsObject[]>;
  selectProperties(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<JsObject[]>;

  //selectAttributeTypes(url: string): any;
  //selectObjectTypes(url: string): any;

  createSubclass(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<any>;
  updateSubclass(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<any>;
  deleteSubclass(schemaOrString: JSONSchema6forRdf | string, conditions: any): Promise<any>;

  //selectArtifactTypeSystemAttributes(url: string, id: number): any;
  //selectArtifactTypeCustomAttributes(url: string, id: number) : any;
}
