/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { JSONSchema6 } from 'json-schema';

export function json2str(data: any): string {
  if (data) return JSON.stringify(data, null, 2);
  return data;
}

export interface JsObject {
  [key: string]: any;
}

export interface JsStrObj {
  [key: string]: string;
}

export interface JsStrObjObj {
  [key: string]: string | JsStrObjObj;
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
  '@context'?: JsStrObjObj; // json-ld
  '@id': string; // json-ld
  //'@included' // json-ld
  //'@graph'?: [] | {}; // json-ld
  //'@nest' // json-ld
  '@type'?: string; // json-ld
  //'@reverse'
  //'@index'

  targetClass: string;

  //inCreationMenu?: boolean;
  //defaultFormat?: string;
  //iconReference?: string;

  properties: {
    [key: string]: JSONSchema6DefinitionForRdfProperty;
  };
}
export type JSONSchema6forRdf2 = JSONSchema6forRdf & {
  '@id'?: string;
};

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
