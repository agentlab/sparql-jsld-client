/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import uuid62 from 'uuid62';
import { types, flow, getParentOfType, getSnapshot } from 'mobx-state-tree';
import { NamedNode, Quad, Variable } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
import { Generator, SelectQuery, Update } from 'sparqljs';
import { cloneDeep } from 'lodash';

import {
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
  JsObject,
} from '../ObjectProvider';
import { Repository } from './Repository';
import { JSONSchema7forRdf } from './Schemas';
import { addprops2vars2props, addTo, addToBgp, addToResult, getSchemaPropType, getSchemaPropUri, propsToSparqlVars } from '../SparqlGen';
import { Bindings, Results } from '../SparqlClient';
import { GetFullIriNamedNodeType, StrConvertorType } from './Prefixes';
import { AxiosResponse } from 'axios';

export const JsObject2 = types.map(types.frozen<any>());
//export interface IJsObject2 extends Instance<typeof JsObject2> {}

export const QueryShape2 = types
  .model('QueryShape2', {
    '@id': types.identifier,
    '@type': types.maybe(types.string),
    // could be class IRI, resolved from local schema reposiory (local cache) or from server
    // or could be 'private' schema (full qualified JS object)
    //schema: types.reference(JSONSchema7forRdf),
    schema: types.union(types.reference(JSONSchema7forRdf), JSONSchema7forRdf),
    //schema: types.union(types.reference(types.late(() => JSONSchema7forRdf)), types.late(() => JSONSchema7forRdf)), 
    //schema: types.union(types.string, types.frozen<JSONSchema6forRdf>()),
    conditions: types.optional(JsObject2, {}),
    /**
     * if null, use all schema props
     * if empty {}, not use schema props
     * if { kk: null }
     * if { kk: val }
     */
    variables: types.union(JsObject2, types.undefined),
    data: types.optional(JsObject2, {}),
  })
  .views((self) => ({
    get schemaJs() {
      return getSnapshot(self.schema);
    },
    get conditionsJs() {
      return getSnapshot(self.conditions);
    },
    get variablesJs() {
      return self.variables ? getSnapshot(self.variables) : undefined;
    },
    get dataJs() {
      return getSnapshot(self.data);
    },
  }));
//export interface IQueryShape2 extends Instance<typeof QueryShape2> {
//  schema: IJSONSchema7forRdf;
//}

// internal properties, created and changed within SPARQL generation
export interface SparqlShapeInternal2 {
  schema: any;
  subj: NamedNode | Variable;
  conditions: JsObject;
  variables?: JsObject;
  data: JsObject;
  props2vars: { [s: string]: string };
  vars2props: { [s: string]: string };
  query: { [s: string]: any }; // partial query (variables and conditions)
  schemaPropsWithoutArrays: any;
  schemaPropsWithArrays: any;
  conditionsWithoutArrays: any;
  conditionsWithArrays: any;
}

function unscreenIds(data: any | undefined) {
  if (data === undefined) return undefined;
  return copyObjectPropsWithRenameOrFilter(data, {
    '@id': null,
    '@type': null,
    '@_id': '@id',
    '@_type': '@type',
  });
}

/**
 * Renumerates variables from shape schema to avoid collisions in SPARQL query,
 * but preserve variables not from schema
 */
function renumerateShapeVariables(shape: SparqlShapeInternal2, index: number) {
  Object.keys(shape.query.variables).forEach((key) => {
    if (!shape.props2vars[key]) {
      if (shape.schema.properties && shape.schema.properties[key])
        addprops2vars2props(shape, key, key + index);
      else addprops2vars2props(shape, key, key);
    }
  });
}

/**
 *
 * @param uri
 * @param varName
 */
function genShapeSparqlSubject(uri: string | undefined, varName: string, getFullIriNamedNode: GetFullIriNamedNodeType): NamedNode | Variable {
  if (uri === undefined) {
    return variable(varName);
  }
  return getFullIriNamedNode(uri);
}

/**
 * generate unique variable name for element iri & check for uniquiness
 * @param varPref '
 * @param no
 */
function genUniqueVarName2(varPref: string, no: number, shapes: any[]): string {
  let varName = varPref + no;
  shapes.forEach((shape) => {
    while (shape.schema.properties && shape.schema.properties.get(varName)) {
      varName += shapes.length;
    }
  });
  return varName;
}

/**
 * generate unique variable name for element iri & check for uniquiness
 * @param varPref '
 * @param no
 */
function genUniqueVarName(varPref: string, no: number, shapes: SparqlShapeInternal2[]): string {
  let varName = varPref + no;
  shapes.forEach((shape) => {
    while (shape.schema.properties && shape.schema.properties[varName]) {
      varName += shapes.length;
    }
  });
  return varName;
}

function getWhereVar(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType, requireOptional = false): { bgps: Quad[]; options: Quad[] } {
  const bgps: Quad[] = [];
  const options: Quad[] = [];
  Object.keys(shape.query.variables).forEach((key) => {
    // filter @id, @type,...
    if (!key.startsWith('@')) {
      const propUri = getSchemaPropUri(shape.schema, key);
      const varName = shape.props2vars[key];
      if (propUri && varName) {
        const option = triple(shape.subj, getFullIriNamedNode(propUri), variable(varName));
        if ((shape.schema.required && shape.schema.required.includes(key)) || requireOptional) {
          bgps.push(option);
        } else {
          options.push(option);
        }
      }
    }
  });
  return { bgps, options };
}

function getWhereVarFromDataWithoutOptinals(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType): any[] {
  const resultWhereVars: any[] = [];
  const bgp: Quad[] = [];
  Object.keys(shape.data).forEach((propertyKey) => {
    if (!propertyKey.startsWith('@')) {
      // filter @id, @type,...
      const propUri = getSchemaPropUri(shape.schema, propertyKey);
      if (propUri) {
        const option = triple(shape.subj, getFullIriNamedNode(propUri), variable(shape.props2vars[propertyKey]));
        bgp.push(option);
      }
    }
  });
  if (bgp.length > 0) {
    resultWhereVars.push({
      type: 'bgp',
      triples: bgp,
    });
  }
  return resultWhereVars;
}

function addToWhere(whereStatements: any[], query: any) {
  if (query) {
    if (query.where) query.where.push(...whereStatements);
    else query.where = whereStatements;
  }
}

function getTypeCondition(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType): any[] {
  return [
    triple(
      shape.subj,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      getFullIriNamedNode(shape.schema.targetClass),
    ),
  ];
}

function conditionsValueToObject(obj: JsObject, propKey: string, shape: SparqlShapeInternal2, abbreviateIri: StrConvertorType): void {
  const prop = shape.schema.properties ? shape.schema.properties[propKey] : undefined;
  if (prop !== undefined) {
    const val = shape.conditions[propKey];
    const type = prop.type;
    if (type !== undefined && val !== undefined) {
      if (type === 'integer') {
        if (typeof val === 'number') obj[propKey] = val;
      } else if (type === 'boolean') {
        if (typeof val === 'boolean') obj[propKey] = val;
      } else if (type === 'string') {
        if (typeof val === 'string') {
          if (prop?.format === 'iri') obj[propKey] = abbreviateIri(val);
          else obj[propKey] = val;
        }
      } else if (type === 'object') {
        if (typeof val === 'string') obj[propKey] = abbreviateIri(val);
        else obj[propKey] = val;
      }
    }
  }
}

function rdfStringValueToObject(obj: JsObject, propKey: string, shape: SparqlShapeInternal2, bindings: Bindings, abbreviateIri: StrConvertorType): void {
  const varKey = shape.props2vars[propKey];
  if (varKey !== undefined) {
    const prop = shape.schema.properties ? shape.schema.properties[propKey] : undefined;
    if (prop !== undefined) {
      const type = prop.type;
      const val = bindings[varKey]?.value;
      if (type !== undefined && val !== undefined) {
        if (type === 'integer') {
          obj[propKey] = parseInt(val, 10);
        } else if (type === 'boolean') {
          if (val === 'true') obj[propKey] = true;
          if (val === 'false') obj[propKey] = false;
        } else if (type === 'string') {
          if (prop?.format === 'iri') obj[propKey] = abbreviateIri(val);
          else obj[propKey] = val;
        } else if (type === 'object') {
          if (typeof val === 'string') obj[propKey] = abbreviateIri(val);
          else obj[propKey] = val;
        }
      }
    }
  }
}

/**
 * Converts SPARQL results into one internal JS object according to JSON Schema from shape
 * retrieved by schemaIri
 * Also converts RDFS variable values into JSON values
 * @param bindings
 * @param schemaIri
 */
function sparqlBindingsToObjectBySchemaIri(bindings: Bindings, shapes: SparqlShapeInternal2[], schemaIri: string, abbreviateIri: StrConvertorType): JsObject {
  const shapeIndex = shapes.findIndex((sh) => sh.schema['@id'] === schemaIri);
  if (shapeIndex >= 0) {
    const shape = shapes[shapeIndex];
    if(shape.schema['@id'] === schemaIri) {
      return sparqlBindingsToObjectByShape(bindings, shape, abbreviateIri);
    }
  }
  return {};
}

function sparqlBindingsToObjectByShape(bindings: Bindings, shape: SparqlShapeInternal2, abbreviateIri: StrConvertorType): JsObject {
  const obj: JsObject = {};
  if (shape.schema.properties) {
    Object.keys(shape.schema.properties).forEach((propKey) => {
      rdfStringValueToObject(obj, propKey, shape, bindings, abbreviateIri);
    });
  }
  // if variables not set, copy all unique prop values from conditions
  if (shape.variables === undefined ||  Object.keys(shape.variables).length > 0) {
    if (shape.variables === undefined || (Object.keys(shape.variables).length === 1 && shape.variables['@type'])) {
      Object.keys(shape.conditions).forEach((propKey) => {
        if (obj[propKey] === undefined) {
          conditionsValueToObject(obj, propKey, shape, abbreviateIri);
        }
      });
    } else {
      // if variables exists, copy only unique prop values which corresponds to variables
      Object.keys(shape.conditions).forEach((propKey) => {
        if (obj[propKey] === undefined && shape.variables && shape.variables[propKey] !== undefined) {
          conditionsValueToObject(obj, propKey, shape, abbreviateIri);
        }
      });
    }
    if (!obj['@type'] && shape.schema) obj['@type'] = shape.schema.targetClass;
  }
  return obj;
}

/**
 * Converts SPARQL results into internal JS objects according to JSON Schema from shape
 * Also converts RDFS variable values into JSON values
 * @param bindings
 * TODO: Add array properties processing
 */
function sparqlBindingsToObjectProp(bindings: Bindings, shapes: SparqlShapeInternal2[], abbreviateIri: StrConvertorType): JsObject {
  const objects: JsObject[] = [];
  shapes.forEach((shape, shapeIndex) => {
    objects[shapeIndex] = sparqlBindingsToObjectByShape(bindings, shape, abbreviateIri);
  });
  if (objects.length === 0) return {};
  if (objects.length === 1) return objects[0];
  // resolve cross-references in data objects
  shapes.forEach((shapeFrom, shapeFromIndex) => {
    Object.keys(shapeFrom.conditions).forEach((propFromKey) => {
      if (shapeFrom.variables === undefined ||  Object.keys(shapeFrom.variables).length > 0) {
        let condFrom = shapeFrom.conditions[propFromKey];
        if (typeof condFrom === 'string' && condFrom.startsWith('?')) {
          condFrom = condFrom.substring(1);
          let shapeToIndex = shapeFromIndex;
          do {
            const shapeTo = shapes[shapeToIndex];
            const props2vars = shapeTo.props2vars;
            const propToKey = Object.keys(props2vars).find((key) => props2vars[key] === condFrom);
            if (propToKey) {
              objects[shapeFromIndex][propFromKey] = objects[shapeToIndex][propToKey];
            }
            shapeToIndex++;
            if (shapeToIndex >= shapes.length) shapeToIndex = 0;
          } while (shapeToIndex !== shapeFromIndex);
        }
      }
    });
  });
  // copy app non-conflicting props into first data object
  objects.forEach((obj, index) => {
    if (index > 0) {
      Object.keys(obj).forEach((fromKey) => {
        if (!objects[0][fromKey]) {
          objects[0][fromKey] = objects[index][fromKey];
        } else {
          if (fromKey === '@type') {
            if (typeof objects[0][fromKey] === 'string') {
              objects[0][fromKey] = [objects[0][fromKey]];
            }
            objects[0][fromKey] = [...objects[0][fromKey], objects[index][fromKey]];
          } else {
            objects[0][fromKey + index] = objects[index][fromKey];
          }
        }
      });
    }
  });
  if (objects.length > 0) return objects[0];
  return {};
}

/**
 * Former addToWhereSuperTypesFilter
 * @param schema
 * @param subj
 */
function createToWhereSuperTypesFilter(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType) {
  if (shape.schema.properties) {
    const typeFilter: any[] = [
      triple(shape.subj as Variable, getFullIriNamedNode('rdf:type'), variable('type0')),
      {
        type: 'filter',
        expression: {
          type: 'operation',
          operator: 'notexists',
          args: [
            {
              type: 'group',
              patterns: [
                {
                  type: 'bgp',
                  triples: [
                    {
                      subject: variable('subtype0'),
                      predicate: {
                        type: 'path',
                        pathType: '^',
                        items: [namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')],
                      },
                      object: shape.subj,
                    },
                    triple(
                      variable('subtype0'),
                      namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
                      variable('type0'),
                    ),
                  ],
                },
                {
                  type: 'filter',
                  expression: {
                    type: 'operation',
                    operator: '!=',
                    args: [variable('subtype0'), variable('type0')],
                  },
                },
              ],
            },
          ],
        },
      },
      {
        type: 'filter',
        expression: {
          type: 'operation',
          operator: 'exists',
          args: [
            {
              type: 'group',
              patterns: [
                {
                  type: 'bgp',
                  triples: [
                    {
                      subject: variable('type0'),
                      predicate: {
                        type: 'path',
                        pathType: '*',
                        items: [namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf')],
                      },
                      object: variable('supertype0'),
                    },
                  ],
                },
                {
                  type: 'filter',
                  expression: {
                    type: 'operation',
                    operator: '=',
                    args: [variable('supertype0'), getFullIriNamedNode(shape.schema.targetClass)],
                  },
                },
              ],
            },
          ],
        },
      },
    ];
    return typeFilter;
  }
  return [];
}

function addToBgpTypeCondition(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType) {
  if (shape.schema.targetClass) {
    const t = triple(
      shape.subj,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      getFullIriNamedNode(shape.schema.targetClass),
    );
    if (!shape.query.bgps) shape.query.bgps = [t];
    else shape.query.bgps = [t, ...shape.query.bgps];
  }
}

function getConditionalTriple(property: any, subj: any, value: any, propUri: string, getFullIriNamedNode: GetFullIriNamedNodeType): Quad {
  if (property.type === 'string') {
    if (property.format === undefined) {
      value = literal(`${value}`, getFullIriNamedNode('xsd:string'));
    } else if (property.format === 'iri') {
      value = getFullIriNamedNode(value);
    } else if (property.format === 'date-time') {
      if (typeof value === 'object') {
        value = literal(value.toISOString(), getFullIriNamedNode('xsd:dateTime'));
      } else {
        value = literal(`${value}`, getFullIriNamedNode('xsd:dateTime'));
      }
    }
  } else if (property.type === 'integer') {
    value = literal(`${value}`, getFullIriNamedNode('xsd:integer'));
  } else if (property.type === 'object') {
    if (property.format === 'date-time') {
      if (typeof value === 'object') {
        //value = `"1970-01-01T00:00:00-02:00"^^http://www.w3.org/2001/XMLSchema#dateTime`;
        value = literal(value.toISOString(), getFullIriNamedNode('xsd:dateTime'));
      } else {
        value = literal(`${value}`, getFullIriNamedNode('xsd:dateTime'));
      }
    } else {
      // IRI
      if (typeof value === 'string') {
        value = getFullIriNamedNode(value);
      }
    }
  }
  return triple(subj, getFullIriNamedNode(propUri), value);
}

function getSimpleFilter(schemaProperty: any, filterProperty: any, variable: Variable, getFullIriNamedNode: GetFullIriNamedNodeType): any {
  const filter: any = {
    operator: '=',
    type: 'operation',
  };
  if (schemaProperty.type === 'string') {
    if (schemaProperty.format === undefined) {
      filter.args = [variable, literal(`${filterProperty}`)];
    } else if (schemaProperty.format === 'iri') {
      filter.args = [variable, getFullIriNamedNode(filterProperty)];
    } else if (schemaProperty.format === 'date-time') {
      if (typeof filterProperty === 'object')
        filter.args = [variable, literal(filterProperty.toISOString(), getFullIriNamedNode('xsd:dateTime'))];
      else filter.args = [variable, literal(filterProperty, getFullIriNamedNode('xsd:dateTime'))];
    }
  } else if (schemaProperty.type === 'integer') {
    filter.args = [variable, literal(`${filterProperty}`, getFullIriNamedNode('xsd:integer'))];
  } else if (schemaProperty.type === 'object') {
    if (schemaProperty.format === 'date-time') {
      if (typeof filterProperty === 'object')
        filter.args = [variable, literal(filterProperty.toISOString(), getFullIriNamedNode('xsd:dateTime'))];
      else filter.args = [variable, literal(`${filterProperty}`)];
    } else {
      if (typeof filterProperty === 'string')
        filter.args = [variable, getFullIriNamedNode(filterProperty)];
      else filter.args = [variable, literal(`${filterProperty}`)];
    }
  } else filter.args = [variable, literal(`${filterProperty}`)];
  return {
    expression: filter,
    type: 'filter',
  };
}

function buildEnumFilter(
  filter: any,
  filterKey: Variable,
  getFullIriNamedNode: GetFullIriNamedNodeType,
  filterValues: any[] = [],
  type = 'url',
  concatOperator = '||',
  compareOperator = '=',
): any {
  if (filterValues.length === 1) {
    filter.type = 'operation';
    filter.operator = compareOperator;
    if (type === 'integer') {
      filter.args = [filterKey, literal(`${filterValues[0]}`, getFullIriNamedNode('xsd:integer'))];
    } else {
      filter.args = [filterKey, getFullIriNamedNode(filterValues[0])];
    }
  } else if (filterValues.length > 1) {
    filter.type = 'operation';
    filter.operator = concatOperator;
    filter.args = [
      buildEnumFilter(
        {},
        filterKey,
        getFullIriNamedNode,
        filterValues.slice(0, filterValues.length - 1),
        type,
        concatOperator,
        compareOperator,
      ),
      buildEnumFilter(
        {},
        filterKey,
        getFullIriNamedNode,
        filterValues.slice(filterValues.length - 1, filterValues.length),
        type,
        concatOperator,
        compareOperator,
      ),
    ];
  }
  return filter;
}

/**
 *
 * @param shape
 */
function getDataTriples(shape: SparqlShapeInternal2, getFullIriNamedNode: GetFullIriNamedNodeType): any[] {
  const triples: Quad[] = [];
  let subj = shape.subj;
  if (shape.subj.termType && shape.subj.termType === 'NamedNode') subj = getFullIriNamedNode(shape.subj);
  /*triples.push(
    triple(
      subj,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      getFullIriNamedNode(shape.schema['@id']),
    ),
  );*/
  Object.keys(shape.data).forEach((propertyKey) => {
    if (shape.schema.properties) {
      const property = shape.schema.properties[propertyKey];
      const value = shape.data[propertyKey];
      if (!propertyKey.startsWith('@')) {
        const propUri = getSchemaPropUri(shape.schema, propertyKey);
        if (property !== undefined && propUri) {
          let triple: Quad = getConditionalTriple(property, subj, value, propUri, getFullIriNamedNode);
          if (triple) {
            triples.push(triple);
          } else if (property.type === 'array') {
            const prop = {
              ...property,
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              ...(<any>property.items),
            };
            if (Array.isArray(value)) {
              value.forEach((v) => {
                triple = getConditionalTriple(prop, subj, v, propUri, getFullIriNamedNode);
                if (triple) triples.push(triple);
              });
            } else {
              triple = getConditionalTriple(prop, subj, value, propUri, getFullIriNamedNode);
              if (triple) triples.push(triple);
            }
          } else {
            console.warn('getDataTriples: Unknown property');
          }
        }
      }
    }
  });
  return triples;
}

//TODO: упростить сигнатуру функции!
//Гармонизировать сигнатуру с другими функциями (getSimpleFilter, getDataTriples)
function getExtendedFilter(
  shape: SparqlShapeInternal2,
  filterKey: string,
  schemaProperty: any,
  filterProperty: any,
  variable: Variable,
  getFullIriNamedNode: GetFullIriNamedNodeType
): any {
  const filter: any = {
    type: 'operation',
  };
  if (schemaProperty.type === 'object') {
    switch (filterProperty.relation) {
      case 'any':
        buildEnumFilter(filter, variable, getFullIriNamedNode, filterProperty.value);
        break;
      case 'notAny':
        buildEnumFilter(filter, variable, getFullIriNamedNode, filterProperty.value, 'url', '&&', '!=');
        break;
      default:
        break;
    }
    if (
      filterProperty.value[0] !== undefined &&
      typeof filterProperty.value[0] === 'string' &&
      filterProperty.relation === 'equal'
    ) {
      filter.operator = '=';
      filter.args = [variable, getFullIriNamedNode(filterProperty.value[0])];
    }
  } else if (schemaProperty.type === 'string') {
    if (schemaProperty.format === 'iri') {
      switch (filterProperty.relation) {
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, getFullIriNamedNode(filterProperty.value[0])];
          break;
        case 'any':
          buildEnumFilter(filter, variable, getFullIriNamedNode, filterProperty.value);
          break;
        case 'notAny':
          buildEnumFilter(filter, variable, getFullIriNamedNode, filterProperty.value, 'url', '&&', '!=');
          break;
        default:
          break;
      }
    } else if (schemaProperty.format === 'date-time') {
      switch (filterProperty.relation) {
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, literal(filterProperty.value[0], getFullIriNamedNode('xsd:dateTime'))];
          break;
        case 'notEqual':
          filter.operator = '!=';
          filter.args = [variable, literal(filterProperty.value[0], getFullIriNamedNode('xsd:dateTime'))];
          break;
        case 'after':
          filter.operator = '>=';
          filter.args = [variable, literal(filterProperty.value[0], getFullIriNamedNode('xsd:dateTime'))];
          break;
        case 'before':
          filter.operator = '<=';
          filter.args = [variable, literal(filterProperty.value[0], getFullIriNamedNode('xsd:dateTime'))];
          break;
        case 'between':
          filter.operator = '&&';
          filter.args = [
            {
              args: [variable, literal(filterProperty.value[0], getFullIriNamedNode('xsd:dateTime'))],
              operator: '>=',
              type: 'operation',
            },
            {
              args: [variable, literal(filterProperty.value[1], getFullIriNamedNode('xsd:dateTime'))],
              operator: '<',
              type: 'operation',
            },
          ];
          break;
        default:
          break;
      }
    } else {
      switch (filterProperty.relation) {
        case 'contains':
          filter.operator = 'contains';
          filter.args = [variable, literal(`${filterProperty.value[0]}`)];
          break;
        case 'notContains':
          filter.operator = '!';
          filter.args = [
            {
              args: [variable, literal(`${filterProperty.value[0]}`)],
              operator: 'contains',
              type: 'operation',
            },
          ];
          break;
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, literal(`${filterProperty.value[0]}`)];
          break;
        case 'startWith':
          filter.operator = 'strstarts';
          filter.args = [variable, literal(`${filterProperty.value[0]}`)];
          break;
        case 'endWith':
          filter.operator = 'strends';
          filter.args = [variable, literal(`${filterProperty.value[0]}`)];
          break;
        case 'regEx':
          filter.operator = 'regex';
          filter.args = [variable, literal(`${filterProperty.value[0]}`), literal('i')];
          break;
        default:
          break;
      }
    }
  } else if (schemaProperty.type === 'integer') {
    switch (filterProperty.relation) {
      case 'equal':
        filter.operator = '=';
        filter.args = [variable, literal(`${filterProperty.value[0]}`, getFullIriNamedNode('xsd:integer'))];
        break;
      case 'any':
        buildEnumFilter(filter, variable, getFullIriNamedNode, filterProperty.value, 'integer');
        break;
      default:
        break;
    }
  } else if (schemaProperty.type === 'array') {
  }

  const propUri = getSchemaPropUri(shape.schema, filterKey);
  switch (filterProperty.relation) {
    case 'exists':
      if (propUri) {
        filter.operator = 'exists';
        filter.args = [
          {
            type: 'bgp',
            triples: [triple(shape.subj, getFullIriNamedNode(propUri), variable)],
          },
        ];
      }
      break;
    case 'notExists':
      if (propUri) {
        filter.operator = 'notexists';
        filter.args = [
          {
            type: 'bgp',
            triples: [triple(shape.subj, getFullIriNamedNode(propUri), variable)],
          },
        ];
      }
      break;
    case 'unassigned':
      break;
    default:
      break;
  }
  return {
    expression: filter,
    type: 'filter',
  };
}

/**
  *
  * @param schema
  * @param conditions
  */
function processConditions(shape: SparqlShapeInternal2, conditions: any, getFullIriNamedNode: GetFullIriNamedNodeType): { bgps: Quad[]; options: Quad[]; filters: any[]; binds: any[] } {
  const bgps: Quad[] = [];
  const options: Quad[] = [];
  const filters: any[] = [];
  const binds: any[] = [];
  Object.keys(conditions).forEach((key) => {
    if (shape.schema.properties && !key.startsWith('@')) {
      const filterProperty = conditions[key];
      const schemaProperty = shape.schema.properties[key];
      const propUri = getSchemaPropUri(shape.schema, key);
      const varName = shape.props2vars[key];

      if (varName) {
        if (schemaProperty) {
          if (propUri) {
            // add FILTER statement
            if (filterProperty.value !== undefined && filterProperty.relation) {
              filters.push(getExtendedFilter(shape, key, schemaProperty, filterProperty, variable(varName), getFullIriNamedNode));
            } else {
              filters.push(getSimpleFilter(schemaProperty, filterProperty, variable(shape.props2vars[key]), getFullIriNamedNode));
            }
          } else {
            // add BIND statement
            if (filterProperty.bind) {
              if (filterProperty.bind.relation) {
                if (filterProperty.bind.relation === 'exists') {
                  const bind: any = {
                    expression: {
                      args: [
                        {
                          type: 'bgp',
                          triples: filterProperty.bind.triples,
                        },
                      ],
                      operator: 'exists',
                      type: 'operation',
                    },
                    type: 'bind',
                    variable: variable(varName),
                  };
                  binds.push(bind);
                }
              }
            }
          }
        }
      } else {
        // add bgp condition triple
        if (schemaProperty && propUri) {
          let option;
          if (typeof filterProperty === 'string' && filterProperty.startsWith('?')) {
            option = triple(
              shape.subj,
              getFullIriNamedNode(propUri),
              variable(filterProperty.substring(1)),
            );
          } else {
            option = getConditionalTriple(schemaProperty, shape.subj, filterProperty, propUri, getFullIriNamedNode);
          }
          //all schema-optional properties treats as required if conditional value exists
          //if (shape.schema.required && shape.schema.required.includes(key)) {
          bgps.push(option);
          //} else {
          //  options.push(option);
          //}
        }
      }
    }
  });
  return { bgps, options, filters, binds };
}

const gen = new Generator();

//@ts-ignore
export const Query2 = types
  .model('Query2', {
    '@id': types.identifier,
    '@type': types.union(types.string, types.undefined),
    // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
    shapes: types.array(QueryShape2),
    // if last digit not specified, we assuming '0' (identifier0)
    orderBy: types.union(types.array(types.frozen<any>()), types.undefined),
    limit: types.union(types.number, types.undefined),
    offset: types.union(types.number, types.undefined),
    distinct: types.union(types.boolean, types.undefined),
    subqueries: types.optional(types.union(types.map(types.late(() => Query2)), types.undefined), undefined),
    // RDF4J REST API options
    options: types.union(types.map(types.string), types.undefined),
  })

  /**
   * Views
   */
  .views((self) => ({
    get optionsJs() {
      return self.options ? getSnapshot(self.options) : undefined;
    },
  }))

  /**
   * Actions
   */
  .actions((self) => {
    const repository = getParentOfType(self, Repository);
    const queryPrefixes = repository.queryPrefixes;

    return {
      getInternalShapes: flow(function* getInternalShapes() {
        const internalShapes: SparqlShapeInternal2[] = [];
        for (let index = 0; index < self.shapes.length; index++) {
          const shape = self.shapes[index];
          let schema: any =  shape.schemaJs;
          if (schema.allOf)
            schema = yield repository.schemas.getSchemaByIri(schema['@id']);
          // make schema snapshot modifiable again by copying it
          schema = cloneDeep(schema);

          const uriVar = genUniqueVarName2('eIri', index, self.shapes);
          const conditions = unscreenIds(shape.conditionsJs) || {};
          const data = unscreenIds(shape.dataJs) || {};
          const variables = unscreenIds(shape.variablesJs);
          if (variables) {
            if (schema.required === undefined) schema.required = [];
            Object.keys(variables).forEach((key) => {
              if (!schema.required.includes(key)) schema.required.push(key);
            });
          }
          const uri = (conditions && conditions['@id']) || (data && data['@id']);
          
          const internalShape: SparqlShapeInternal2 = {
            // TODO: partial schema!!!
            schema,
            conditions,
            data,
            variables,
            subj: genShapeSparqlSubject(uri, uriVar, queryPrefixes.getFullIriNamedNode),
            props2vars: {},
            vars2props: {},
            query: {},
            schemaPropsWithoutArrays: {},
            schemaPropsWithArrays: {},
            conditionsWithoutArrays: {},
            conditionsWithArrays: {},
          };
          addprops2vars2props(internalShape, '@id', uriVar);
          internalShapes.push(internalShape);
        }
        return internalShapes;
      }),
      
      /**
       * SELECT
       */

      selectInternalShapes(internalShapes: SparqlShapeInternal2[]) {
        internalShapes.forEach((shape, index) => {
          shape.query.variables = {};
          if (shape.schema.properties) {
            //if (shape.variables) {
            //  copyUniqueObjectProps(shape.query.variables, shape.variables);
            //}
            //else {
              // if variables not set, copy all from schema except @type
              // copy as variables: all non-conditional properties, properties with "extended filter functions" or "bindings"
              // did not copy properties with conditions with values or reference ?xxx variables
              const ignoredProperties: JsObject = {
                '@type': null,
                //targetClass: null,
              };
              const conditions = shape.conditions;
              Object.keys(conditions).forEach((key) => {
                const filterProperty = conditions[key];
                if (
                  filterProperty.value === undefined &&
                  filterProperty.relation === undefined &&
                  filterProperty.bind === undefined
                )
                  ignoredProperties[key] = null;
              });
              const properties = shape.schema.properties;
              // if shape has only conditions and array property then did not make subquery
              //extract array variables into subquery
              const propKeys = Object.keys(properties);
              const isArrayOnly = propKeys.length <= 2 && propKeys.filter((key) => key === '@id').length === 1;
              propKeys.forEach((key) => {
                if (properties[key].type === 'array' && !isArrayOnly) {
                  shape.schemaPropsWithArrays[key] = properties[key];
                  if (conditions[key] !== undefined) shape.conditionsWithArrays[key] = conditions[key];
                } else {
                  shape.schemaPropsWithoutArrays[key] = properties[key];
                  if (conditions[key] !== undefined) shape.conditionsWithoutArrays[key] = conditions[key];
                }
              });
              if (shape.variables) {
                copyUniqueObjectProps(shape.query.variables, shape.variables);
              } else {
                //copy the rest
                copyUniqueObjectProps(
                  shape.query.variables,
                  copyObjectPropsWithRenameOrFilter(shape.schemaPropsWithoutArrays, ignoredProperties),
                );
              }
            //}
          }
          renumerateShapeVariables(shape, index);
        });
        internalShapes.forEach((shape) => {
          const { bgps, options } = getWhereVar(shape, queryPrefixes.getFullIriNamedNode);
          const whereConditions = processConditions(shape, shape.conditionsWithoutArrays, queryPrefixes.getFullIriNamedNode);
          shape.query.bgps = [...whereConditions.bgps, ...bgps];
          shape.query.options = [...whereConditions.options, ...options];
          shape.query.filters = whereConditions.filters;
          shape.query.binds = whereConditions.binds;
        });
        return internalShapes;
      },

      selectObjectsInternalShapes: flow(function* selectObjectsInternalShapes() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = self.selectInternalShapes(yield self.getInternalShapes());
        internalShapes.forEach((shape) => {
          addToBgpTypeCondition(shape, queryPrefixes.getFullIriNamedNode);
        });
        return internalShapes;
      }),

      selectQueryFromShapes(internalShapes: SparqlShapeInternal2[]) {
        const query: SelectQuery = {
          type: 'query',
          queryType: 'SELECT',
          prefixes: queryPrefixes.currentJs,
          variables: [],
        };
        // generate query
        internalShapes.forEach((shape, index) => {
          //add SHACL graph
          /*if (shape.schema.targetClass) {
            shape.schema.targetClass;
          }*/
          // check variables for uniquiness
          const generatedVariables = propsToSparqlVars(shape);
          let variablesToAdd: Variable[];
          if (query.variables.length === 0) {
            variablesToAdd = generatedVariables;
          } else {
            variablesToAdd = [];
            let flag = false;
            generatedVariables.forEach((v1) => {
              for (let i = 0; i < query.variables.length; i++) {
                const v2 = (query.variables as Variable[])[i];
                if (v1.value === v2.value) {
                  flag = true;
                  break;
                }
              }
              if (flag === false) {
                variablesToAdd.push(v1);
              } else {
                flag = false;
              }
            });
          }
          //@ts-ignore
          query.variables.push(...variablesToAdd);
          // create result query from partial queries
          const results: any[] = [];
          addToResult(
            results,
            shape.query.bgps,
            shape.query.options,
            shape.query.filters,
            shape.query.binds,
          );
          addToWhere(results, query);
        });
        if (self.orderBy) query.order = self.orderBy;
        if (self.limit) query.limit = self.limit;
        if (self.offset) query.offset = self.offset;
        if (self.distinct) query.distinct = self.distinct;
        return query;
      },

      selectObjectsQueryStr: flow(function* selectObjectsQueryStr() {
        //@ts-ignore
        const internalShapes = yield self.selectObjectsInternalShapes();
        //@ts-ignore
        const query = self.selectQueryFromShapes(internalShapes);
        return gen.stringify(query as SelectQuery);
      }),

      /**
       * Заменяет
       * @param obj
       */
      selectObjectsArrayProperties: flow(function* selectObjectsArrayProperties(internalShapes: SparqlShapeInternal2[], objects: JsObject[]) {
        //console.debug('selectObjectsArrayProperties');
        for(let index = 0; index < internalShapes.length; index++){
          const shape = internalShapes[index];
          const schema = shape.schema;
          const anyContext = schema['@context'];
          const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
          for (const key of Object.keys(shape.schemaPropsWithArrays)) {
            for (const object of objects) {
              const prop = shape.schemaPropsWithArrays[key];
              const schemaWithArrayProperty: any = {
                ...schema,
                '@id': '_' + uuid62.v4(),
                '@context': {
                  [key]: context[key],
                },
                properties: {
                  '@id': schema.properties['@id'],
                  [key]: prop,
                },
                required: ['@id', key],
              };
              const propType = getSchemaPropType(schemaWithArrayProperty.properties, context, key);
              if (prop && prop.type && propType) {
                let schemaUri: string | undefined = undefined;
                if ((prop.type === 'array' && prop.items) || (prop.type === 'object')) {
                  schemaUri = repository.schemas.getByClassId(propType);
                  if (!schemaUri) {
                    schemaUri = propType;
                  }
                } else if (prop.type === 'string' && prop.format === 'iri') {
                  schemaUri = propType;
                }
                if (schemaUri) {
                  const schema2 = yield repository.schemas.getSchemaByIri(schemaUri);
                  const query = yield repository.addQuery([
                    {
                      schema: schemaWithArrayProperty,
                      conditions: {
                        '@_id': object['@id'],
                        property: '?eIri1',
                      },
                      variables: {},// ignore schema props in SELECT xxx variables
                    },
                    {
                      schema: schema2,
                    }
                  ]);
                  //const genQueryStr = query.selectObjectsQueryStr();
                  //console.debug('selectObjectsArrayProperties query=', genQueryStr);
                  const subObjects: Results = yield query.selectObjects()
                  repository.removeQuery(query);
                  //console.debug('selectObjectsArrayProperties results=', json2str(subObjects));
                  object[key] = subObjects;
                }
              }
            }
          }
        }
        //console.debug('END selectObjectsArrayProperties');
        return objects;
      }),

      selectObjects: flow(function* selectObjects() {
        const s1 = getSnapshot(self);
        //@ts-ignore
        const internalShapes = yield self.selectObjectsInternalShapes();
        //@ts-ignore
        const query = self.selectQueryFromShapes(internalShapes);
        const queryStr = gen.stringify(query as SelectQuery);
        //console.debug('selectObjects query=', queryStr);
        const results: Results = yield repository.sparqlSelect(queryStr, self.optionsJs);
        const objects = results.bindings.map((b) => sparqlBindingsToObjectProp(b, internalShapes, queryPrefixes.abbreviateIri));

        //process array properties
        //@ts-ignore
        yield self.selectObjectsArrayProperties(internalShapes, objects);
        //console.debug('selectObjects objects_with_arrays=', json2str(objects));
        return objects;
      }),

      selectObjectsWithTypeInfoQuery: flow(function* selectObjectsWithTypeInfoQuery(internalShapes: SparqlShapeInternal2[]) {
        if (internalShapes[0].variables === undefined) {
          internalShapes[0].query.variables['@type'] = internalShapes[0].schema.properties['@type'];
          addprops2vars2props(internalShapes[0], '@type', 'type0');
        }
        //@ts-ignore
        const query = self.selectQueryFromShapes(internalShapes);
        internalShapes.forEach((shape) => {
          query.where = [
            ...createToWhereSuperTypesFilter(shape, queryPrefixes.getFullIriNamedNode),
            ...(query.where || []),
          ];
          //this.addToBgpTypeCondition(shape);
        });

        return query;
      }),

      selectObjectsWithTypeInfoQueryStr: flow(function* selectObjectsWithTypeInfoQueryStr() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = self.selectInternalShapes(yield self.getInternalShapes());
        //@ts-ignore
        const query = yield self.selectObjectsWithTypeInfoQuery(internalShapes);
        return gen.stringify(query);
      }),

      selectObjectsWithTypeInfo: flow(function* selectObjectsWithTypeInfo() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = self.selectInternalShapes(yield self.getInternalShapes());
        //@ts-ignore
        const query = yield self.selectObjectsWithTypeInfoQuery(internalShapes);
        const queryStr = gen.stringify(query as SelectQuery);
        //console.debug('selectObjectsWithTypeInfo query=', queryStr);
        const results: Results = yield repository.sparqlSelect(queryStr, self.optionsJs);
        const objects = results.bindings.map((b) => sparqlBindingsToObjectProp(b, internalShapes, queryPrefixes.abbreviateIri));

        //process array properties
        //@ts-ignore
        yield self.selectObjectsArrayProperties(internalShapes, objects);
        //console.debug('selectObjects objects_with_arrays=', json2str(objects));
        return objects;
      }),

      /**
       * DELETE
       */

      deleteObjectQuery(internalShapes: SparqlShapeInternal2[]) {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insertdelete',
              delete: [],
              insert: [],
            },
          ],
        };
        internalShapes.forEach((shape, index) => {
          shape.query.variables = {
            ...shape.conditions,
          };
          //renumerate variables to avoid collisions in SPARQL query
          Object.keys(shape.query.variables).forEach((key) => {
            if (!shape.props2vars[key]) addprops2vars2props(shape, key, key + index);
          });
          const pVarName = genUniqueVarName('p', index, internalShapes);
          const oVarName = genUniqueVarName('o', index, internalShapes);
          addTo(query.updates[0], 'delete', addToBgp([triple(shape.subj, variable(pVarName), variable(oVarName))]));

          let { bgps, options } = getWhereVar(shape, queryPrefixes.getFullIriNamedNode, true);
          let filters: any[] = [];
          let binds: any[] = [];
          bgps = [
            ...getTypeCondition(shape, queryPrefixes.getFullIriNamedNode),
            triple(shape.subj, variable(pVarName), variable(oVarName)),
            ...bgps
          ];
          // if element has URI -- its enough otherwise we need to add other conditions
          if (!shape.conditions['@id']) {
            const whereConditions = processConditions(shape, shape.conditions, queryPrefixes.getFullIriNamedNode);
            bgps = [...whereConditions.bgps, ...bgps];
            options = [...whereConditions.options, ...options];
            filters = whereConditions.filters;
            binds = whereConditions.binds;
          }
          // TODO: create result query from partial queries
          //shape.query.bgps = bgps;
          //shape.query.options = options;
          //shape.query.filters = filters;
          const results: any[] = [];
          addToResult(results, bgps, options, filters, binds);
          addTo(query.updates[0], 'where', results);
        });
        return query;
      },

      deleteObjectQueryStr: flow(function* deleteObjectQueryStr() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = yield self.getInternalShapes();
        //@ts-ignore
        const query = self.deleteObjectQuery(internalShapes);
        return gen.stringify(query);
      }),

      deleteObject: flow(function* deleteObject() {
        //@ts-ignore
        const queryStr = yield self.deleteObjectQueryStr();
        //console.debug('deleteObject query=', queryStr);
        const response: AxiosResponse = yield repository.sparqlUpdate(queryStr, self.optionsJs);
        return response;
      }),

      /**
       * INSERT
       */

      insertObjectQuery(internalShapes: SparqlShapeInternal2[]) {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insert',
              insert: [],
            },
          ],
        };
        internalShapes.forEach((shape) => {
          const triples = getTypeCondition(shape, queryPrefixes.getFullIriNamedNode)
            .concat(getDataTriples(shape, queryPrefixes.getFullIriNamedNode));
          addTo(query.updates[0], 'insert', addToBgp(triples));
        });
        return query;
      },

      insertObjectQueryStr: flow(function* insertObjectQueryStr() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = yield self.getInternalShapes();
        //@ts-ignore
        const query = self.insertObjectQuery(internalShapes);
        return gen.stringify(query);
      }),

      createObject: flow(function* createObject() {
        //@ts-ignore
        const queryStr = yield self.insertObjectQueryStr();
        //console.debug('createObject query=', queryStr);
        const response: AxiosResponse = yield repository.sparqlUpdate(queryStr, self.optionsJs);
        return response;
      }),

     /**
       * UPDATE
       */
      updateObjectQuery(internalShapes: SparqlShapeInternal2[]) {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insertdelete',
              delete: [],
              insert: [],
            },
          ],
        };
        internalShapes.forEach((shape, index) => {
          addTo(query.updates[0], 'insert', addToBgp(getDataTriples(shape, queryPrefixes.getFullIriNamedNode)));
          shape.query.variables = {
            ...shape.conditions,
            ...shape.data,
          };
          renumerateShapeVariables(shape, index);
          addTo(query.updates[0], 'delete', getWhereVarFromDataWithoutOptinals(shape, queryPrefixes.getFullIriNamedNode));

          let { bgps, options } = getWhereVar(shape, queryPrefixes.getFullIriNamedNode);
          let filters: any[] = [];
          let binds: any[] = [];
          bgps = [
            ...getTypeCondition(shape, queryPrefixes.getFullIriNamedNode),
            ...bgps
          ];
          // if element has URI -- its enough otherwise we need to add other conditions
          if (!shape.conditions['@id']) {
            const whereConditions = processConditions(shape, shape.conditions, queryPrefixes.getFullIriNamedNode);
            bgps = [...whereConditions.bgps, ...bgps];
            options = [...whereConditions.options, ...options];
            filters = whereConditions.filters;
            binds = whereConditions.binds;
          }
          const results: any[] = [];
          addToResult(results, bgps, options, filters, binds);
          addTo(query.updates[0], 'where', results);
        });
        return query;
      },

      updateObjectQueryStr: flow(function* updateObjectQueryStr() {
        //@ts-ignore
        const internalShapes: SparqlShapeInternal2[] = yield self.getInternalShapes();
        //@ts-ignore
        const query = self.updateObjectQuery(internalShapes);
        return gen.stringify(query);
      }),

      updateObject: flow(function* updateObject() {
        //@ts-ignore
        const queryStr = yield self.updateObjectQueryStr();
        //console.debug('updateObject query=', queryStr);
        const response: AxiosResponse = yield repository.sparqlUpdate(queryStr, self.optionsJs);
        return response;
      }),
    };
  });
//export interface IQuery2 extends Instance<typeof Query2> {}