/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import _isUrl from 'is-url';
import { isArray } from 'lodash-es';

import { Quad, NamedNode, Variable } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
import { BgpPattern, Generator, OptionalPattern } from 'sparqljs';

import { Bindings } from './SparqlClient';
import {
  JSONSchema6forRdf,
  JSONSchema6forRdfProperty,
  JsObject,
  copyObjectPropsWithRenameOrFilter,
  JsStrObj,
} from './ObjectProvider';

export function isUrl(str: string): boolean {
  if (_isUrl(str) === true) return true;
  if (str.startsWith('cpgu:///')) return true;
  return false;
}

export function serializeUri(uri: string): string {
  if (isUrl(uri) === true) {
    return `<${uri}>`;
  }
  return uri;
}

/**
 * BiMap on two JS objects
 * Maps Schema properties keys to SPARQL query variable names and vice versa
 * @param entConstr
 * @param propName
 * @param varName
 */
export function addprops2vars2props(
  entConstr: Pick<EntConstrInternal, 'props2vars' | 'vars2props'>,
  propName: string,
  varName: string,
): void {
  entConstr.props2vars[propName] = varName;
  entConstr.vars2props[varName] = propName;
}

/**
 * Mapping from JSON Schema-like properties to SPARQL named variables
 * More complex then one to one because of '@id' props from JSON-LD
 * '@id' -> 'uri'
 * @param schemaProps -- map of properties
 */
export function propsToSparqlVars(entConstr: Pick<EntConstrInternal, 'props2vars' | 'query'>): Variable[] {
  if (entConstr.query.variables === undefined) return [];
  const variables = Object.keys(entConstr.query.variables).map((key) => {
    const val = entConstr.props2vars[key];
    if (val !== undefined) key = val;
    return variable(key);
  });
  return variables;
}

export function getSchemaPropUri(schema: JSONSchema6forRdf, propertyKey: string): string | string[] | undefined {
  const properties = schema.properties;
  const context = schema['@context'];
  if (properties && context && typeof context !== 'string') {
    const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
    if (prop !== undefined && propertyKey !== '@id') {
      const propContext = (context as any)[propertyKey];
      if (propContext) {
        if (typeof propContext === 'string') {
          return propContext;
        } else if (propContext['@id']) {
          return propContext['@id'];
        } else if (propContext['@reverse']) {
          return ['^', propContext['@reverse']];
        }
      }
    }
  }
  return undefined;
}

export function getSchemaPropType(
  properties: { [key: string]: JSONSchema6forRdfProperty },
  context: JsObject,
  propertyKey: string,
): string | undefined {
  const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
  const propContext = context[propertyKey];
  if (prop && prop.type && propContext && propContext['@type']) {
    if (prop.type === 'object') {
      return propContext['@type'];
    } else if (prop.type === 'string' && prop.format === 'iri') {
      return propContext['@type'];
    } else if (prop.type === 'array' && prop.items && (prop.items as any).type) {
      if ((prop.items as any).type === 'object') {
        return propContext['@type'];
      } else if ((prop.items as any).type === 'string' && (prop.items as any).format === 'iri') {
        return propContext['@type'];
      }
    }
  }
  return undefined;
}

export function addTo(query: JsObject, key: string, statements: any[]): void {
  if (query) {
    if (query[key]) query[key].push(...statements);
    else query[key] = statements;
  }
}

export function addToBgp(triples: any[]): any[] {
  const resultBgp: any[] = [];
  addToResult(resultBgp, triples);
  return resultBgp;
}

export function toBgp(data: any): BgpPattern {
  return {
    type: 'bgp',
    triples: isArray(data) ? data : [data],
  };
}

export function toOptional(data: any): OptionalPattern {
  return {
    type: 'optional',
    patterns: isArray(data) ? data : [data],
  };
}

export function addToResult(result: any[], bgpTriples: any[], options?: Quad[], filters?: any[], binds?: any[]): void {
  if (bgpTriples.length > 0) {
    result.push(toBgp(bgpTriples));
  }
  if (options) {
    options.forEach((option) => {
      result.push(toOptional(toBgp(option)));
    });
  }
  if (filters) {
    filters.forEach((filter) => {
      result.push(filter);
    });
  }
  if (binds) {
    binds.forEach((bind) => {
      result.push(bind);
    });
  }
}

export const eIriVarNameRegEx = /^eIri([0-9]+)$/;
export const eIriRegEx = /^\?eIri([0-9]+)$/;
export const gen = new Generator();

//
// External API
//
export interface ICollConstrJsOpt {
  '@id'?: string;
  '@type'?: string;
  '@parent'?: string;
  // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  entConstrs: IEntConstrJsOpt[];
  // if last digit not specified, we assuming '0' (identifier0)
  orderBy?: any[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
  //sub-queries: types.optional(types.union(types.map(types.late(() => CollConstr)), types.undefined), undefined),
  // RDF4J REST API options
  options?: JsStrObj;
}
export interface IEntConstrJsOpt {
  '@id'?: string;
  '@type'?: string;
  '@parent'?: string;
  // external properties from Sparql EntConstr could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  schema: JSONSchema6forRdf;
  conditions?: JsObject;
  variables?: JsObject;
  data?: JsObject;
  resolveType?: boolean;
}

//
// Internal
//
export interface ICollConstrJs {
  '@id'?: string;
  '@type'?: string;
  '@parent'?: string;
  // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  entConstrs: IEntConstrJs[];
  // if last digit not specified, we assuming '0' (identifier0)
  orderBy?: any[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
  //sub-queries: types.optional(types.union(types.map(types.late(() => CollConstr)), types.undefined), undefined),
  // RDF4J REST API options
  options?: JsStrObj;
}

export interface IEntConstrJs extends EntConstrData {
  '@id'?: string;
  '@type'?: string;
}
export interface EntConstrData {
  // external properties from Sparql EntConstr could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  schema: JSONSchema6forRdf;
  conditions: JsObject;
  variables?: JsObject;
  data: JsObject;
  resolveType?: boolean;
}
/**
 * Internal Entity Constraints
 * Contains internal properties, created and changed within SPARQL generation
 */
export interface EntConstrInternal extends EntConstrData {
  // internal properties, created and changed within SPARQL generation
  prefixes: JsStrObj;
  subj: NamedNode | Variable;
  props2vars: JsStrObj; // MST property to indexed sparql var (e.g. name -> name0)
  vars2props: JsStrObj; // indexed sparql var to MST property (e.g. name0 -> name)
  // pred-partial
  qCond: {
    bgps: Quad[];
    options: Quad[];
    filters: any[];
    binds: any[];
    bindsVars: JsObject;
  };
  qTypeConds: Quad[];
  qTypeFilters: any[];
  // partial query (variables and conditions)
  query: {
    variables: { [s: string]: any };
    bgps: any[];
    filters: any[];
    binds: any[];
    options: any[];
    templates: any[];
  };
  ignoredProperties: JsObject;
  schemaPropsWithoutArrays: any;
  schemaPropsWithArrays: any;
  conditionsWithoutArrays: JsObject;
  conditionsWithArrays: JsObject;
  props: JsObject;
  /**
   * Outgoing References dictionary
   * ConditionProp: EntConstrNumberInArray
   */
  relatedTo: { [s: string]: number };
  /**
   * Incoming References dictionary
   * ConditionProp: EntConstrNumberInArray
   */
  relatedFrom: { [s: string]: number };
  bindsVars: JsObject;
  subEntConstr?: EntConstrInternal;
}

export function unscreenIds(data: any | undefined) {
  if (data === undefined) return undefined;
  return copyObjectPropsWithRenameOrFilter(data, {
    '@id': null,
    '@type': null,
    '@_id': '@id',
    '@_type': '@type',
  });
}

/**
 * Re-numerate variables from entConstr schema to avoid collisions in SPARQL query,
 * but preserve variables not from schema
 */
export function renumerateEntConstrVariables(entConstr: EntConstrInternal, index: number) {
  Object.keys(entConstr.query.variables).forEach((key) => {
    if (!entConstr.props2vars[key]) {
      if (entConstr.schema.properties && entConstr.schema.properties[key])
        addprops2vars2props(entConstr, key, key + index);
      else addprops2vars2props(entConstr, key, key);
    }
  });
}

/**
 * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
 * @param fullIri -- full-qualified IRI
 * @returns abbreviated IRI based on this.current Map
 * For example, the IRI http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral would be abbreviated as rdf:XMLLiteral
 */
export function abbreviateIri(fullIri: string, prefixes: JsStrObj): string {
  let nsEntries: { prefix: string; ns: string }[] = [];
  if (fullIri && !fullIri.startsWith('urn:')) {
    Object.keys(prefixes).forEach((prefix) => {
      const ns = prefixes[prefix];
      if (ns && fullIri.startsWith(ns)) nsEntries.push({ prefix, ns });
    });
    if (nsEntries.length > 1) {
      nsEntries = [nsEntries.reduce((prev, curr) => (curr.ns.length > prev.ns.length ? curr : prev))];
    }
    if (nsEntries.length === 1) {
      const value = fullIri.substring(nsEntries[0].ns.length);
      return `${nsEntries[0].prefix}:${value}`;
    } else {
      const [, value] = fullIri.match(/[#]([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', ''];
      if (value) {
        const shortUri = fullIri.substring(0, fullIri.lastIndexOf(value));
        const prefix = Object.keys(prefixes).find((key) => prefixes[key] === shortUri);

        if (prefix) {
          return `${prefix}:${value}`;
        }
      }
    }
  }
  return fullIri;
}

/**
 * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
 * @param abbreviatedIri
 * @param prefixes
 * @returns not abbreviated Iri
 * For example, the IRI rdf:XMLLiteral would be de-abbreviated as http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral
 */
export function deAbbreviateIri(abbreviatedIri: string, prefixes: JsStrObj): string {
  if (abbreviatedIri && !abbreviatedIri.startsWith('urn:')) {
    const [, prefixKey, propertyKey] = abbreviatedIri.match(/^([\d\w-_]+):([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', '', ''];
    if (prefixKey && propertyKey) {
      const resolverPrefix = prefixes[prefixKey];
      if (!resolverPrefix) {
        throw new Error(`Cannot resolve prefix '${prefixKey}' for IRI '${abbreviatedIri}'`);
      }
      return `${resolverPrefix}${propertyKey}`;
    }
  }
  return abbreviatedIri;
}

/**
 * See getFullIriNamedNodeType
 * @param uri
 */
export function getFullIriNamedNode(uri: string | NamedNode, prefixes: JsStrObj): NamedNode {
  if (typeof uri === 'object') {
    uri = uri.value;
  }
  return namedNode(deAbbreviateIri(uri, prefixes));
}

/**
 *
 * @param uri
 * @param varName
 */
export function genEntConstrSparqlSubject(
  uri: string | undefined,
  varName: string,
  prefixes: JsStrObj,
): NamedNode | Variable {
  if (uri === undefined) {
    return variable(varName);
  }
  return getFullIriNamedNode(uri, prefixes);
}

/**
 * generate unique variable name for element iri & check for uniqueness
 * @param varPref '
 * @param no
 */
export function genUniqueVarName2(varPref: string, no: number, entConstrs: IEntConstrJsOpt[]): string {
  let varName = varPref + no;
  entConstrs.forEach((constr) => {
    while (constr.schema.properties && constr.schema.properties[varName]) {
      varName += entConstrs.length;
    }
  });
  return varName;
}

/**
 * generate unique variable name for element iri & check for uniqueness
 * @param varPref '
 * @param no
 */
export function genUniqueVarName(varPref: string, no: number, entConstrs: EntConstrData[]): string {
  let varName = varPref + no;
  entConstrs.forEach((entConstr) => {
    while (entConstr.schema.properties && entConstr.schema.properties[varName]) {
      varName += entConstrs.length;
    }
  });
  return varName;
}

export function getWhereVar(entConstr: EntConstrInternal, requireOptional = false): { bgps: Quad[]; options: Quad[] } {
  const bgps: Quad[] = [];
  const options: Quad[] = [];
  Object.keys(entConstr.query.variables).forEach((key) => {
    // filter @id, @type,...
    if (!key.startsWith('@')) {
      const propUri = getSchemaPropUri(entConstr.schema, key);
      const varName = entConstr.props2vars[key];
      if (propUri && varName) {
        const option = getTripleWithPredOrPath(entConstr.subj, propUri, variable(varName), entConstr.prefixes);
        if ((entConstr.schema.required && entConstr.schema.required.includes(key)) || requireOptional) {
          bgps.push(option);
        } else {
          options.push(option);
        }
      }
    }
  });
  return { bgps, options };
}

export function getWhereVarFromDataWithoutOptionals(entConstr: EntConstrInternal): any[] {
  const resultWhereVars: any[] = [];
  const bgp: Quad[] = [];
  Object.keys(entConstr.data).forEach((propertyKey) => {
    if (!propertyKey.startsWith('@')) {
      // filter @id, @type,...
      const propUri = getSchemaPropUri(entConstr.schema, propertyKey);
      if (propUri) {
        const option = getTripleWithPredOrPath(
          entConstr.subj,
          propUri,
          variable(entConstr.props2vars[propertyKey]),
          entConstr.prefixes,
        );
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

export function addToWhere(whereStatements: any[], query: any) {
  if (query) {
    if (query.where) query.where.push(...whereStatements);
    else query.where = whereStatements;
  }
}

export function getTypeCondition(entConstr: EntConstrInternal): any[] {
  return [
    triple(
      entConstr.subj,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      getFullIriNamedNode(entConstr.schema.targetClass, entConstr.prefixes),
    ),
  ];
}

export function conditionsValueToObject(obj: JsObject, propKey: string, entConstr: EntConstrInternal): void {
  const prop = entConstr.schema.properties ? entConstr.schema.properties[propKey] : undefined;
  if (prop !== undefined) {
    const val = entConstr.conditions[propKey];
    const type = prop.type;
    if (type !== undefined && val !== undefined) {
      if (type === 'integer') {
        if (typeof val === 'number') obj[propKey] = val;
      } else if (type === 'boolean') {
        if (typeof val === 'boolean') obj[propKey] = val;
      } else if (type === 'string') {
        if (typeof val === 'string') {
          if (prop?.format === 'iri') obj[propKey] = abbreviateIri(val, entConstr.prefixes);
          else obj[propKey] = val;
        }
      } else if (type === 'object') {
        if (typeof val === 'string') obj[propKey] = abbreviateIri(val, entConstr.prefixes);
        else obj[propKey] = val;
      }
    }
  }
}

export function rdfStringValueToObject(
  obj: JsObject,
  propKey: string,
  entConstr: EntConstrInternal,
  bindings: Bindings,
): void {
  const varKey = entConstr.props2vars[propKey];
  if (varKey !== undefined) {
    const prop = entConstr.schema.properties ? entConstr.schema.properties[propKey] : undefined;
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
          if (prop?.format === 'iri') obj[propKey] = abbreviateIri(val, entConstr.prefixes);
          else obj[propKey] = val;
        } else if (type === 'object') {
          if (typeof val === 'string') obj[propKey] = abbreviateIri(val, entConstr.prefixes);
          else obj[propKey] = val;
        }
      }
    }
  }
}

/**
 * Former addToWhereSuperTypesFilter
 * @param schema
 * @param subj
 */
export function genSuperTypesFilter(entConstr: EntConstrInternal, index: number) {
  let typeFilter: any[] = [];
  if (entConstr.schema.properties) {
    typeFilter = [
      triple(entConstr.subj as Variable, getFullIriNamedNode('rdf:type', entConstr.prefixes), variable('type' + index)),
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
                      subject: variable('subtype' + index),
                      predicate: {
                        type: 'path',
                        pathType: '^',
                        items: [namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')],
                      },
                      object: entConstr.subj,
                    },
                    triple(
                      variable('subtype' + index),
                      namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
                      variable('type' + index),
                    ),
                  ],
                },
                {
                  type: 'filter',
                  expression: {
                    type: 'operation',
                    operator: '!=',
                    args: [variable('subtype' + index), variable('type' + index)],
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
                      subject: variable('type' + index),
                      predicate: {
                        type: 'path',
                        pathType: '*',
                        items: [namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf')],
                      },
                      object: variable('supertype' + index),
                    },
                  ],
                },
                {
                  type: 'filter',
                  expression: {
                    type: 'operation',
                    operator: '=',
                    args: [
                      variable('supertype' + index),
                      getFullIriNamedNode(entConstr.schema.targetClass, entConstr.prefixes),
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ];
  }
  return typeFilter;
}

export function genTypeCondition(entConstr: EntConstrInternal) {
  let result: Quad[] = [];
  if (entConstr.schema.targetClass) {
    result = [
      triple(
        entConstr.subj,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        getFullIriNamedNode(entConstr.schema.targetClass, entConstr.prefixes),
      ),
    ];
  }
  return result;
}

export function getConditionalTriple(
  property: any,
  subj: any,
  value: any,
  propUri: string | string[],
  prefixes: JsStrObj,
): Quad {
  if (property.type === 'string') {
    if (property.format === undefined) {
      value = literal(`${value}`, getFullIriNamedNode('xsd:string', prefixes));
    } else if (property.format === 'iri') {
      value = getFullIriNamedNode(value, prefixes);
    } else if (property.format === 'date-time') {
      if (typeof value === 'object') {
        value = literal(value.toISOString(), getFullIriNamedNode('xsd:dateTime', prefixes));
      } else {
        value = literal(`${value}`, getFullIriNamedNode('xsd:dateTime', prefixes));
      }
    }
  } else if (property.type === 'integer') {
    value = literal(`${value}`, getFullIriNamedNode('xsd:integer', prefixes));
  } else if (property.type === 'object') {
    if (property.format === 'date-time') {
      if (typeof value === 'object') {
        //value = `"1970-01-01T00:00:00-02:00"^^http://www.w3.org/2001/XMLSchema#dateTime`;
        value = literal(value.toISOString(), getFullIriNamedNode('xsd:dateTime', prefixes));
      } else {
        value = literal(`${value}`, getFullIriNamedNode('xsd:dateTime', prefixes));
      }
    } else {
      // IRI
      if (typeof value === 'string') {
        value = getFullIriNamedNode(value, prefixes);
      }
    }
  }
  return getTripleWithPredOrPath(subj, propUri, value, prefixes);
}

export function getTripleWithPredOrPath(subj: any, propUri: string | string[], value: any, prefixes: JsStrObj): Quad {
  if (isArray(propUri)) {
    return triple(
      subj,
      {
        type: 'path',
        pathType: propUri[0],
        items: [getFullIriNamedNode(propUri[1], prefixes)],
      } as any,
      value,
    );
  } else {
    return triple(subj, getFullIriNamedNode(propUri, prefixes), value);
  }
}

export function getSimpleFilter(schemaProperty: any, filterProperty: any, variable: Variable, prefixes: JsStrObj): any {
  const filter: any = {
    operator: '=',
    type: 'operation',
  };
  if (schemaProperty.type === 'string') {
    if (schemaProperty.format === undefined) {
      filter.args = [variable, literal(`${filterProperty}`)];
    } else if (schemaProperty.format === 'iri') {
      filter.args = [variable, getFullIriNamedNode(filterProperty, prefixes)];
    } else if (schemaProperty.format === 'date-time') {
      if (typeof filterProperty === 'object')
        filter.args = [variable, literal(filterProperty.toISOString(), getFullIriNamedNode('xsd:dateTime', prefixes))];
      else filter.args = [variable, literal(filterProperty, getFullIriNamedNode('xsd:dateTime', prefixes))];
    }
  } else if (schemaProperty.type === 'integer') {
    filter.args = [variable, literal(`${filterProperty}`, getFullIriNamedNode('xsd:integer', prefixes))];
  } else if (schemaProperty.type === 'object') {
    if (schemaProperty.format === 'date-time') {
      if (typeof filterProperty === 'object')
        filter.args = [variable, literal(filterProperty.toISOString(), getFullIriNamedNode('xsd:dateTime', prefixes))];
      else filter.args = [variable, literal(`${filterProperty}`)];
    } else {
      if (typeof filterProperty === 'string') filter.args = [variable, getFullIriNamedNode(filterProperty, prefixes)];
      else filter.args = [variable, literal(`${filterProperty}`)];
    }
  } else filter.args = [variable, literal(`${filterProperty}`)];
  return {
    expression: filter,
    type: 'filter',
  };
}

export function buildEnumFilter(
  filter: any,
  filterKey: Variable,
  prefixes: JsStrObj,
  filterValues: any[] = [],
  type = 'url',
  concatOperator = '||',
  compareOperator = '=',
): any {
  if (filterValues.length === 1) {
    filter.type = 'operation';
    filter.operator = compareOperator;
    if (type === 'integer') {
      filter.args = [filterKey, literal(`${filterValues[0]}`, getFullIriNamedNode('xsd:integer', prefixes))];
    } else {
      filter.args = [filterKey, getFullIriNamedNode(filterValues[0], prefixes)];
    }
  } else if (filterValues.length > 1) {
    filter.type = 'operation';
    filter.operator = concatOperator;
    filter.args = [
      buildEnumFilter(
        {},
        filterKey,
        prefixes,
        filterValues.slice(0, filterValues.length - 1),
        type,
        concatOperator,
        compareOperator,
      ),
      buildEnumFilter(
        {},
        filterKey,
        prefixes,
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
 * @param entConstr
 */
export function getDataTriples(entConstr: EntConstrInternal): any[] {
  const triples: Quad[] = [];
  let subj = entConstr.subj;
  if (entConstr.subj.termType && entConstr.subj.termType === 'NamedNode')
    subj = getFullIriNamedNode(entConstr.subj, entConstr.prefixes);
  /*triples.push(
    triple(
      subj,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      getFullIriNamedNode(entConstr.schema['@id']),
    ),
  );*/
  Object.keys(entConstr.data).forEach((propertyKey) => {
    if (entConstr.schema.properties) {
      const property = entConstr.schema.properties[propertyKey];
      const value = entConstr.data[propertyKey];
      if (!propertyKey.startsWith('@')) {
        const propUri = getSchemaPropUri(entConstr.schema, propertyKey);
        if (property !== undefined && propUri) {
          let triple: Quad = getConditionalTriple(property, subj, value, propUri, entConstr.prefixes);
          if (triple) {
            triples.push(triple);
          } else if (property.type === 'array') {
            const prop = {
              ...property,
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              ...(<any>property.items),
            };
            if (isArray(value)) {
              value.forEach((v) => {
                triple = getConditionalTriple(prop, subj, v, propUri, entConstr.prefixes);
                if (triple) triples.push(triple);
              });
            } else {
              triple = getConditionalTriple(prop, subj, value, propUri, entConstr.prefixes);
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
export function getExtendedFilter(
  entConstr: EntConstrInternal,
  filterKey: string,
  schemaProperty: any,
  filterProperty: any,
  variable: Variable,
): any {
  const filter: any = {
    type: 'operation',
  };
  if (schemaProperty.type === 'object') {
    switch (filterProperty.relation) {
      case 'any':
        buildEnumFilter(filter, variable, entConstr.prefixes, filterProperty.value);
        break;
      case 'notAny':
        buildEnumFilter(filter, variable, entConstr.prefixes, filterProperty.value, 'url', '&&', '!=');
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
      filter.args = [variable, getFullIriNamedNode(filterProperty.value[0], entConstr.prefixes)];
    }
  } else if (schemaProperty.type === 'string') {
    if (schemaProperty.format === 'iri') {
      switch (filterProperty.relation) {
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, getFullIriNamedNode(filterProperty.value[0], entConstr.prefixes)];
          break;
        case 'any':
          buildEnumFilter(filter, variable, entConstr.prefixes, filterProperty.value);
          break;
        case 'notAny':
          buildEnumFilter(filter, variable, entConstr.prefixes, filterProperty.value, 'url', '&&', '!=');
          break;
        default:
          break;
      }
    } else if (schemaProperty.format === 'date-time') {
      const first = filterProperty.value[0];
      switch (filterProperty.relation) {
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, literal(first, getFullIriNamedNode('xsd:dateTime', entConstr.prefixes))];
          break;
        case 'notEqual':
          filter.operator = '!=';
          filter.args = [variable, literal(first, getFullIriNamedNode('xsd:dateTime', entConstr.prefixes))];
          break;
        case 'after':
          filter.operator = '>=';
          filter.args = [variable, literal(first, getFullIriNamedNode('xsd:dateTime', entConstr.prefixes))];
          break;
        case 'before':
          filter.operator = '<=';
          filter.args = [variable, literal(first, getFullIriNamedNode('xsd:dateTime', entConstr.prefixes))];
          break;
        case 'between':
          filter.operator = '&&';
          filter.args = [
            {
              args: [variable, literal(first, getFullIriNamedNode('xsd:dateTime', entConstr.prefixes))],
              operator: '>=',
              type: 'operation',
            },
            {
              args: [
                variable,
                literal(filterProperty.value[1], getFullIriNamedNode('xsd:dateTime', entConstr.prefixes)),
              ],
              operator: '<',
              type: 'operation',
            },
          ];
          break;
        default:
          break;
      }
    } else {
      const first = `${filterProperty.value[0]}`;
      switch (filterProperty.relation) {
        case 'contains':
          filter.operator = 'contains';
          filter.args = [variable, literal(first)];
          break;
        case 'notContains':
          filter.operator = '!';
          filter.args = [
            {
              args: [variable, literal(first)],
              operator: 'contains',
              type: 'operation',
            },
          ];
          break;
        case 'equal':
          filter.operator = '=';
          filter.args = [variable, literal(first)];
          break;
        case 'startWith':
          filter.operator = 'strstarts';
          filter.args = [variable, literal(first)];
          break;
        case 'endWith':
          filter.operator = 'strends';
          filter.args = [variable, literal(first)];
          break;
        case 'regEx':
          filter.operator = 'regex';
          filter.args = [variable, literal(first), literal('i')];
          break;
        default:
          break;
      }
    }
  } else if (schemaProperty.type === 'integer') {
    const first = `${filterProperty.value[0]}`;
    switch (filterProperty.relation) {
      case 'equal':
        filter.operator = '=';
        filter.args = [variable, literal(first, getFullIriNamedNode('xsd:integer', entConstr.prefixes))];
        break;
      case 'notEqual':
        filter.operator = '!=';
        filter.args = [variable, literal(first, getFullIriNamedNode('xsd:integer', entConstr.prefixes))];
        break;
      case 'after':
        filter.operator = '>=';
        filter.args = [variable, literal(first, getFullIriNamedNode('xsd:integer', entConstr.prefixes))];
        break;
      case 'before':
        filter.operator = '<=';
        filter.args = [variable, literal(first, getFullIriNamedNode('xsd:integer', entConstr.prefixes))];
        break;
      case 'between':
        filter.operator = '&&';
        filter.args = [
          {
            args: [variable, literal(first, getFullIriNamedNode('xsd:integer', entConstr.prefixes))],
            operator: '>=',
            type: 'operation',
          },
          {
            args: [
              variable,
              literal(`${filterProperty.value[1]}`, getFullIriNamedNode('xsd:integer', entConstr.prefixes)),
            ],
            operator: '<',
            type: 'operation',
          },
        ];
        break;
      case 'between-incl-both':
        filter.operator = '&&';
        filter.args = [
          {
            args: [
              variable,
              literal(`${filterProperty.value[0]}`, getFullIriNamedNode('xsd:integer', entConstr.prefixes)),
            ],
            operator: '>=',
            type: 'operation',
          },
          {
            args: [
              variable,
              literal(`${filterProperty.value[1]}`, getFullIriNamedNode('xsd:integer', entConstr.prefixes)),
            ],
            operator: '<=',
            type: 'operation',
          },
        ];
        break;
      case 'any':
        buildEnumFilter(filter, variable, entConstr.prefixes, filterProperty.value, 'integer');
        break;
      default:
        break;
    }
  } /*else if (schemaProperty.type === 'array') {
  }*/

  const propUri = getSchemaPropUri(entConstr.schema, filterKey);
  switch (filterProperty.relation) {
    case 'exists':
      if (propUri) {
        filter.operator = 'exists';
        filter.args = [
          {
            type: 'bgp',
            triples: [getTripleWithPredOrPath(entConstr.subj, propUri, variable, entConstr.prefixes)],
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
            triples: [getTripleWithPredOrPath(entConstr.subj, propUri, variable, entConstr.prefixes)],
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
export function processConditions(
  entConstr: EntConstrInternal,
  conditions: any,
  requireOptional = false,
): { bgps: Quad[]; options: Quad[]; filters: any[]; binds: any[]; bindsVars: JsObject } {
  const bgps: Quad[] = [];
  const options: Quad[] = [];
  const filters: any[] = [];
  const binds: any[] = [];
  const bindsVars: JsObject = {};
  Object.keys(conditions).forEach((key) => {
    if (entConstr.schema.properties && !key.startsWith('@')) {
      const filterProperty = conditions[key];
      const schemaProperty = entConstr.schema.properties[key];
      const propUri = getSchemaPropUri(entConstr.schema, key);
      const varName = entConstr.props2vars[key];

      if (varName) {
        if (schemaProperty) {
          if (propUri) {
            // add FILTER statement
            if (filterProperty.value !== undefined && filterProperty.relation) {
              filters.push(getExtendedFilter(entConstr, key, schemaProperty, filterProperty, variable(varName)));
            } else {
              filters.push(
                getSimpleFilter(
                  schemaProperty,
                  filterProperty,
                  variable(entConstr.props2vars[key]),
                  entConstr.prefixes,
                ),
              );
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
                  bindsVars[key] = varName;
                }
              }
            }
          }
        }
      } else {
        // create condition triple instead of filter
        if (schemaProperty && propUri) {
          let option;
          if (typeof filterProperty === 'string' && filterProperty.startsWith('?')) {
            option = getTripleWithPredOrPath(
              entConstr.subj,
              propUri,
              variable(filterProperty.substring(1)),
              entConstr.prefixes,
            );
          } else {
            option = getConditionalTriple(schemaProperty, entConstr.subj, filterProperty, propUri, entConstr.prefixes);
          }
          // add condition triple to BGPS or OPTIONS
          if (requireOptional) {
            //all schema-optional properties treats as required if conditional value exists
            bgps.push(option);
          } else {
            if (entConstr.schema.required && entConstr.schema.required.includes(key)) {
              bgps.push(option);
            } else {
              options.push(option);
            }
          }
        }
      }
    }
  });
  return { bgps, options, filters, binds, bindsVars };
}

export function getInternalCollConstrs(
  collConstr: ICollConstrJsOpt,
  prefixes: JsStrObj,
  addConditions?: JsObject | JsObject[],
  addData?: JsObject | JsObject[],
) {
  const internalCollConstrs: EntConstrInternal[] = [];
  if (addConditions && !isArray(addConditions)) addConditions = [addConditions];
  if (addData && !isArray(addData)) addData = [addData];

  for (let index = 0; index < collConstr.entConstrs.length; index++) {
    const constr = collConstr.entConstrs[index] as EntConstrData;
    const schema = constr.schema;
    if (schema.required === undefined) schema.required = [];

    const uriVar = genUniqueVarName2('eIri', index, collConstr.entConstrs);
    let conditions = unscreenIds(constr.conditions) || {};
    if (addConditions && addConditions.length > index) {
      conditions = {
        ...conditions,
        ...unscreenIds((addConditions as JsObject[])[index]),
      };
    }
    let data = unscreenIds(constr.data) || {};
    if (addData && addData.length > index) {
      data = {
        ...data,
        ...unscreenIds((addData as JsObject[])[index]),
      };
    }
    const variables = unscreenIds(constr.variables);
    if (variables) {
      if (schema.required === undefined) schema.required = [];
      Object.keys(variables).forEach((key) => {
        if (schema.required && !schema.required.includes(key)) schema.required.push(key);
      });
    } /*) {
          if (schema.required && !schema.required.includes(key)) schema.required.push(key);
        }
      });
    }*/
    // make simple conditions mandatory
    /*if (conditions) {
      Object.keys(conditions).forEach((key) => {
        const propSchema = schema.properties[key];
        if (propSchema /*&& !(propSchema?.format === 'iri')*/ const uri =
      (conditions && conditions['@id']) || (data && data['@id']);
    const entConstr: EntConstrInternal = {
      // TODO: partial schema!!!
      schema,
      conditions,
      variables,
      data,
      resolveType: constr.resolveType,
      prefixes,
      // internal
      subj: genEntConstrSparqlSubject(uri, uriVar, prefixes),
      props2vars: {},
      vars2props: {},
      qCond: {
        bgps: [],
        options: [],
        filters: [],
        binds: [],
        bindsVars: {},
      },
      qTypeConds: [],
      qTypeFilters: [],
      query: {
        variables: {},
        bgps: [],
        filters: [],
        binds: [],
        options: [],
        templates: [],
      },
      ignoredProperties: {},
      schemaPropsWithoutArrays: {},
      schemaPropsWithArrays: {},
      conditionsWithoutArrays: {},
      conditionsWithArrays: {},
      props: {},
      relatedTo: {},
      relatedFrom: {},
      bindsVars: {},
    };
    addprops2vars2props(entConstr, '@id', uriVar);
    internalCollConstrs.push(entConstr);
  }
  if (internalCollConstrs.length > 1) {
    addRelatedToAndFrom(internalCollConstrs);
  }
  return internalCollConstrs;
}

export function isReferencedAndOptional(entConstrs: EntConstrInternal[], index: number) {
  const entConstrTo = entConstrs[index];
  const key = Object.keys(entConstrTo.relatedFrom).find((key2) => {
    const index2 = entConstrTo.relatedFrom[key2];
    const entConstrFrom = entConstrs[index2];
    return !entConstrFrom.schema.required?.includes(key2);
  });
  if (key) return true;
  return false;
}

/**
 *
 * @param entConstrs
 * @param index
 */
export function separateReferencedQuads(quads: Quad[]) {
  let refs: { quad: Quad; index: number }[] = [];
  const nonRefs = quads.filter((quad) => {
    if (quad.object.termType === 'Variable') {
      const match = quad.object.value.match(eIriVarNameRegEx);
      if (match) {
        const index = parseInt(match[1]);
        refs = [...refs, { quad, index }];
        return false;
      }
    }
    return true;
  });
  return { nonRefs, refs };
}

export function addRelatedToAndFrom(entConstrs: EntConstrInternal[]) {
  entConstrs.forEach((entConstr, index) => {
    const conditions = entConstr.conditions;
    Object.keys(conditions).forEach((key) => {
      const val = conditions[key];
      if (typeof val === 'string') {
        const match = val.match(eIriRegEx);
        if (match) {
          const index2 = parseInt(match[1]);
          if (index2 >= 0 && index2 < entConstrs.length) {
            const fromEntConstr = entConstrs[index];
            const toEntConstr = entConstrs[index2];
            if (fromEntConstr && toEntConstr) {
              fromEntConstr.relatedTo[key] = index2;
              toEntConstr.relatedFrom[key] = index;
            }
          }
        }
      }
    });
  });
}

export function localUrn(name: string) {
  return `urn:sparqljsldclient:${name}`;
}
