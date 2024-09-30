/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import {
  JSONSchema7LD,
  JsObject,
  JSONSchema7LDPropertyDefinition,
  copyObjectProps,
  copyUniqueArrayElements,
} from './ObjectProvider';

export const schemaNonPrimitivePropsKeys = ['@context', 'properties', 'required'];

function combineProperties(oldObj: any, newObj: any, schema: JSONSchema7LD): any {
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

export function createObjectWithoutRepetitions(objects: any[], schema: JSONSchema7LD): any[] {
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

//TODO: Proper support for Abbreviated IRI and non abbreviated
function propertyNameShapeToSchema(shapePropsUri: string): string {
  let [, , propertyKey] = shapePropsUri.match(/^([\d\w-_]+):([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', '', ''];
  if (propertyKey === '') {
    let i = shapePropsUri.lastIndexOf('#');
    if (i < 0) i = shapePropsUri.lastIndexOf('/');
    propertyKey = shapePropsUri.substring(i + 1) || '';
  }
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
  schemaProps: Record<string, JSONSchema7LDPropertyDefinition>,
  schemaContexts: JsObject,
  schemaReqs: string[],
): string | undefined {
  if (shapePropUri) {
    const shapePropKey = propertyNameShapeToSchema(shapePropUri);
    schemaProps[shapePropKey] = {};
    let schemaProp: JSONSchema7LDPropertyDefinition = schemaProps[shapePropKey];
    //label conversion
    if (shapeProp.name) schemaProp.title = shapeProp.name;
    Object.keys(shapeProp)
      .filter(
        (k) => !['@id', '@type', 'name', 'path', 'datatype', 'class', 'nodeKind', 'minCount', 'maxCount'].includes(k),
      )
      .forEach((fk: any) => ((schemaProp as JsObject)[fk] = shapeProp[fk]));
    //cardinality
    if (shapeProp.maxCount === undefined || shapeProp.maxCount > 1) {
      schemaProp.type = 'array';
      schemaProp.items = {};
      schemaProp = schemaProp.items as JSONSchema7LDPropertyDefinition;
    }
    if (shapeProp.minCount) {
      if (shapeProp.minCount > 0) {
        schemaReqs.push(shapePropKey);
      }
    }
    //element default value
    if (shapeProp.defaultValue) schemaProp.default = shapeProp.defaultValue;
    //element type
    if (shapeProp.datatype) {
      if (shapeProp.datatype === 'xsd:dateTime') {
        schemaProp.type = 'string';
        schemaProp.format = 'date-time';
      } else if (shapeProp.datatype === 'rdf:HTML') {
        schemaProp.type = 'string';
        schemaProp.contentMediaType = 'text/html';
        //schemaProp.format = 'date-time';
      } else if (shapeProp.datatype === 'xsd:string') schemaProp.type = 'string';
      else if (
        shapeProp.datatype === 'xsd:integer' ||
        shapeProp.datatype === 'xsd:int' ||
        shapeProp.datatype === 'xsd:long' ||
        shapeProp.datatype === 'xsd:byte' ||
        shapeProp.datatype === 'xsd:short'
      )
        schemaProp.type = 'integer';
      else if (
        shapeProp.datatype === 'xsd:double' ||
        shapeProp.datatype === 'xsd:float' ||
        shapeProp.datatype === 'xsd:decimal'
      )
        schemaProp.type = 'number';
      else if (shapeProp.datatype === 'xsd:boolean') schemaProp.type = 'boolean';
      else if (shapeProp.datatype === 'xsd:base64Binary') {
        schemaProp.type = 'string';
        schemaProp.contentEncoding = 'base64';
      } else if (
        shapeProp.datatype === 'xsd:unsignedByte' ||
        shapeProp.datatype === 'xsd:unsignedShort' ||
        shapeProp.datatype === 'xsd:unsignedInt' ||
        shapeProp.datatype === 'xsd:unsignedLong' ||
        shapeProp.datatype === 'xsd:positiveInteger' ||
        shapeProp.datatype === 'xsd:nonNegativeInteger' ||
        shapeProp.datatype === 'xsd:negativeInteger' ||
        shapeProp.datatype === 'xsd:nonPositiveInteger'
      )
        schemaProp.type = 'integer';
      schemaContexts[shapePropKey] = {
        '@id': shapePropUri,
        '@type': shapeProp.datatype,
      };
    } else if (shapeProp.nodeKind) {
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
          schemaContexts[shapePropKey] = {
            '@id': shapePropUri,
            '@type': '@id',
          };
        }
      }
    } else {
      //TODO: handle sh:or ( [ sh:datatype xsd:string ] [ sh:datatype rdf:langString ] ) ;
      schemaProp.type = 'string';
    }
    return shapePropKey;
  }
  return undefined;
}

export function propertyShapesToSchemaProperties(
  shapeProps: any[] | undefined,
): [Record<string, JSONSchema7LDPropertyDefinition>, JsObject, string[]] {
  const schemaProps: Record<string, JSONSchema7LDPropertyDefinition> = {};
  const schemaContexts: JsObject = {};
  const schemaReqs: string[] = [];
  if (shapeProps) {
    shapeProps.forEach((shapeProp) => {
      const schemaPropUri = shapeProp.path;
      const propKey = propertyShapeToJsonSchemaProperty(
        shapeProp,
        schemaPropUri,
        schemaProps,
        schemaContexts,
        schemaReqs,
      );
    });
  }
  return [schemaProps, schemaContexts, schemaReqs];
}

//TODO: only works with {} form of @context. String [] and string form are not supported.
/**
 * Adds to child schema unique elements from parentSchema's properties: @context, properties, required
 * Does not copy props from parent schema if prop key present in schema
 * @param schema
 * @param parentSchema
 */
export function addToSchemaParentSchema(schema: JSONSchema7LD, parentSchema: JSONSchema7LD): JSONSchema7LD {
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
