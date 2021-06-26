/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { variable } from '@rdfjs/data-model';

import {
  JSONSchema6forRdf,
  JsObject,
  JSONSchema6DefinitionForRdfProperty,
  copyObjectProps,
  copyUniqueArrayElements,
} from './ObjectProvider';

export const schemaNonPrimitivePropsKeys = ['@context', 'properties', 'required'];

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

export function createObjectWithoutRepetitions(objects: any[], schema: JSONSchema6forRdf): any[] {
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

export function makeOrderBy(orderBy: string): any {
  let descending = false;
  let variable1 = '';
  if (orderBy.startsWith('ASC(')) {
    variable1 = orderBy.substr(4, orderBy.length - 5);
  } else if (orderBy.startsWith('DESC(')) {
    variable1 = orderBy.substr(5, orderBy.length - 6);
    descending = true;
  } else {
    variable1 = orderBy;
  }
  // if not ends with a digit, assume 0
  const c = variable1.charAt(variable1.length - 1);
  if (c < '0' || c > '9') variable1 += '0';
  return {
    expression: variable(variable1),
    descending,
  };
}

export const uiMapping: JsObject = {
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
  xhtmlText: {
    'ui:widget': 'TinyMCEWidget',
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
  if (propShape.valueModifiability !== 'user') propUiSchema['ui:disabled'] = true;
  if (propShape.order) propUiSchema['ui:order'] = propShape.order;
}

export function propertyShapesToSchemaProperties(
  shapeProps: any[] | undefined,
): [{ [key: string]: JSONSchema6DefinitionForRdfProperty }, JsObject, string[], JsObject] {
  const schemaProps: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
  const schemaContexts: JsObject = {};
  const schemaReqs: string[] = [];
  const uiSchema: JsObject = {};
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
      if (propKey) {
        propertyShapeToUiSchema(shapeProp, schemaProps, propKey, uiSchema);
      }
    });
  }
  return [schemaProps, schemaContexts, schemaReqs, uiSchema];
}

//TODO: only works with {} form of @context. String [] and string form are not supported.
/**
 * Adds to child schema unique elements from parentSchema's properties: @context, properties, required
 * Does not copy props from parent schema if prop key present in schema
 * @param schema
 * @param parentSchema
 */
export function addToSchemaParentSchema(schema: JSONSchema6forRdf, parentSchema: JSONSchema6forRdf): JSONSchema6forRdf {
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
