/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import uuid62 from 'uuid62';
import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

export function json2str(data: any): string {
  if (data) return JSON.stringify(data, null, 2);
  return data;
}

export type JsObject = Record<string, any>;

export type JsStrObj = Record<string, string>;

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

export type JSONSchema7LDPropertyDefinition = JSONSchema7LDProperty;
export interface JSONSchema7LDProperty extends JSONSchema7 {
  /**
   * json-ld Property
   * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
   */
  '@id'?: string | undefined;
  '@type'?: string | undefined;
  order?: number | undefined; // SHACL Shapes

  // permissions extension
  valueModifiability?: string | undefined; // user or non -- system
  shapeModifiability?: string | undefined; // user or non -- system

  properties?: Record<string, JSONSchema7LDPropertyDefinition> | undefined;
}

export type JSONSchema7LDDefinition = JSONSchema7LD;
export interface JSONSchema7LD extends Omit<JSONSchema7, 'allOf'>, JsObject {
  allOf?: { $ref: string }[] | undefined; // override from this: "allOf?: JSONSchema6Definition[] | undefined;"
  type: JSONSchema7TypeName; // restrict from this: "type?: JSONSchema6TypeName | JSONSchema6TypeName[] | undefined;"

  /**
   * json-ld Node extensions
   * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
   */
  '@context'?: JsStrObjObj | undefined; // json-ld
  '@id': string; // json-ld
  //'@included' // json-ld
  //'@graph'?: [] | {}; // json-ld
  //'@nest' // json-ld
  '@type'?: string | undefined; // json-ld (SHACL Shape IRI -- shape IRI itself, not shaped class IRI)
  //'@reverse'
  //'@index'

  targetClass: string; // SHACL Shape Class IRI (shaped class IRI)

  // Artifact extensions
  //inCreationMenu?: boolean;
  //defaultFormat?: string;
  //iconReference?: string;

  properties: Record<string, JSONSchema7LDPropertyDefinition>;
}

export function copyObjectProps(objTo: JsObject, objFrom: JsObject): void {
  Object.keys(objFrom).forEach((objFromKey) => {
    objTo[objFromKey] = objFrom[objFromKey];
  });
}

/**
 *
 * @param objTo
 * @param objFrom
 */
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

export function getPropKeysByFormat(schema: JSONSchema7LD, format: string): string[] {
  const props: string[] = [];
  for (const key in schema.properties) {
    if (schema.properties[key].format === format) {
      props.push(key);
    }
  }
  return props;
}

export function addMissingId(data: any | undefined) {
  if (data && typeof data === 'object' && !data['@id']) data['@id'] = '_' + uuid62.v4();
}
