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
import { cloneDeep, isArray } from 'lodash-es';
import { Quad, Variable } from '@rdfjs/types/data-model';
import { ConstructQuery, Ordering, SelectQuery } from 'sparqljs';
import jsonld from 'jsonld';

import { Bindings, Results, SparqlClient } from './SparqlClient';
import {
  JsObject,
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
  JsStrObjObj,
  JSONSchema6forRdf,
  JsStrObj,
} from './ObjectProvider';
import {
  addprops2vars2props,
  genTypeCondition,
  conditionsValueToObject,
  genSuperTypesFilter,
  EntConstrInternal,
  factory,
  getWhereVar,
  processConditions,
  propsToSparqlVars,
  rdfStringValueToObject,
  renumerateEntConstrVariables,
  isReferencedAndOptional,
  getInternalCollConstrs,
  gen,
  ICollConstrJsOpt,
  toOptional,
  toBgp,
  separateReferencedQuads,
  getSchemaPropType,
  deAbbreviateIri,
  localUrn,
  getSchemaPropUri,
  getTripleWithPredOrPath,
} from './SparqlGen';

export async function selectObjectsQuery(collConstrJs2: ICollConstrJsOpt, nsJs: any, client: SparqlClient) {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs);
  selectInternalEntConstrs(entConstrs);

  const query = selectQueryFromEntConstrs(entConstrs, collConstrJs);
  const queryStr = gen.stringify(query);
  //console.log('selectObjects query=', queryStr);
  const results: Results = await client.sparqlSelect(queryStr, collConstrJs.options);
  const objects = results.bindings.map((b) => sparqlBindingsToObjectProp(b, entConstrs));
  //process array properties
  await selectObjectsArrayProperties(entConstrs, objects, client);
  //console.debug('selectObjects objects_with_arrays=', json2str(objects));
  return objects;
}

export async function selectObjectsArrayProperties(
  entConstrs: EntConstrInternal[],
  objects: JsObject[],
  client: SparqlClient,
) {
  //console.debug('selectObjectsArrayProperties');
  for (let index = 0; index < entConstrs.length; index++) {
    const entConstr = entConstrs[index];
    const schema = entConstr.schema;
    const anyContext = schema['@context'];
    const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
    for (const key of Object.keys(entConstr.schemaPropsWithArrays)) {
      for (const object of objects) {
        const prop = entConstr.schemaPropsWithArrays[key];
        const schemaWithArrayProperty: JSONSchema6forRdf = {
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
          //let schemaUri: string | undefined;
          let constrWithSchema2: EntConstrInternal | undefined;
          let schema2: JSONSchema6forRdf;
          if ((prop.type === 'array' && prop.items) || prop.type === 'object') {
            //schemaUri = repository.schemas.getByClassId(propType);
            constrWithSchema2 = entConstrs.find((c) => c.schema.targetClass === propType);
            if (!constrWithSchema2) {
              //schemaUri = propType;
              constrWithSchema2 = entConstrs.find((c) => c.schema['@id'] === propType);
            }
          } else if (prop.type === 'string' && prop.format === 'iri') {
            //schemaUri = propType;
            constrWithSchema2 = entConstrs.find((c) => c.schema['@id'] === propType);
          }
          if (constrWithSchema2) {
            schema2 = constrWithSchema2.schema;
            //schema2 = repository.schemas.getOrLoadSchemaByIri(schemaUri);
            if (schema2) {
              //schema2 = getSnapshot(schema2);
              const subObjects = await selectObjectsQuery(
                {
                  entConstrs: [
                    {
                      schema: schemaWithArrayProperty,
                      conditions: {
                        '@_id': object['@id'],
                        property: '?eIri1',
                      },
                      variables: {}, // ignore schema props in SELECT xxx variables
                    },
                    {
                      schema: schema2,
                    },
                  ],
                },
                entConstr.prefixes,
                client,
              );
              //console.debug('selectObjectsArrayProperties results=', json2str(subObjects));
              object[key] = subObjects;
            }
          }
        }
      }
    }
  }
  //console.debug('END selectObjectsArrayProperties');
  return objects;
}

function analyseProps(entConstrs: EntConstrInternal[]) {
  entConstrs.forEach((entConstr) => {
    if (entConstr.schema.properties) {
      // if variables not set, mark for copy all from schema except @type (ignore it)
      // mark for copy as variables: all non-conditional properties, properties with "extended filter functions" or "bindings"
      // did not mark for copy (ignore it) properties with conditions with values or reference ?xxx variables
      entConstr.ignoredProperties = {
        '@type': null,
        //targetClass: null,
      };
      const conditions = entConstr.conditions;
      Object.keys(conditions).forEach((key) => {
        const filterProperty = conditions[key];
        if (
          filterProperty.value === undefined &&
          filterProperty.relation === undefined &&
          filterProperty.bind === undefined
        )
          entConstr.ignoredProperties[key] = null;
      });
      const properties = entConstr.schema.properties;
      // if EntConstr has only conditions and array property then did not make sub-query
      //extract array variables into sub-query
      const propKeys = Object.keys(properties);
      const isArrayOnly = propKeys.length <= 2 && propKeys.filter((key) => key === '@id').length === 1;
      propKeys.forEach((key) => {
        if (properties[key].type === 'array' && !isArrayOnly) {
          entConstr.schemaPropsWithArrays[key] = properties[key];
          if (conditions[key] !== undefined) entConstr.conditionsWithArrays[key] = conditions[key];
        } else {
          entConstr.schemaPropsWithoutArrays[key] = properties[key];
          if (conditions[key] !== undefined) entConstr.conditionsWithoutArrays[key] = conditions[key];
        }
      });
    }
  });
}

function convertOrderBy(orderBy: any, entConstrs: any | any[] | undefined): any {
  if (isArray(orderBy)) return orderBy.map((e) => convertOrderBy(e, entConstrs));
  if (orderBy.expression || !orderBy.variable) return orderBy;
  let entConstrVariable = orderBy.variable;
  if (entConstrs) {
    entConstrVariable =
      (isArray(entConstrs) ? entConstrs.find((e) => e.props2vars[entConstrVariable]) : entConstrs)?.props2vars[
        entConstrVariable
      ] || orderBy.variable;
  }
  return {
    expression: factory.variable(entConstrVariable),
    descending: orderBy?.descending || false,
  };
}

function sortResults(objects: JsObject[], orderBy: any[]) {
  return objects.sort((a: JsObject, b: JsObject) => {
    const order = orderBy?.find((o) => o.variable && a[o.variable] != b[o.variable]);
    if (!order) return 0;
    let a1 = a[order.variable];
    let b1 = b[order.variable];
    if (!a1 && b1) {
      if (order.descending) return 1;
      return -1;
    }
    if (a1 && !b1) {
      if (order.descending) return -1;
      return 1;
    }
    if (typeof a1 === 'number' && typeof b1 === 'number') {
      if (order.descending) return b1 - a1;
      return a1 - b1;
    }
    if (typeof a1 === 'string' && typeof b1 === 'string') {
      if (order.descending) return b1.localeCompare(a1);
      return a1.localeCompare(b1);
    }
    a1 = typeof a1 === 'string' ? a1 : a1.toString();
    b1 = typeof b1 === 'string' ? b1 : b1.toString();
    if (order.descending) return b1.localeCompare(a1);
    return a1.localeCompare(b1);
  });
}

/**
 * SELECT
 */

/**
 *
 * @param entConstrs
 * @param prefixes
 */
function selectInternalEntConstrs(entConstrs: EntConstrInternal[]) {
  analyseProps(entConstrs);
  entConstrs.forEach((entConstr, index) => {
    if (entConstr.schema.properties) {
      if (entConstr.variables) {
        copyUniqueObjectProps(entConstr.query.variables, entConstr.variables);
      } else {
        //copy the rest
        copyUniqueObjectProps(
          entConstr.query.variables,
          copyObjectPropsWithRenameOrFilter(entConstr.schemaPropsWithoutArrays, entConstr.ignoredProperties),
        );
      }
    }
    if (entConstr.resolveType) {
      if (entConstr.variables === undefined) {
        entConstr.query.variables['@type'] = entConstr.schema.properties['@type'];
        addprops2vars2props(entConstr, '@type', 'type' + index);
      }
    }
    renumerateEntConstrVariables(entConstr, index);
  });
  entConstrs.forEach((entConstr, index) => {
    const { bgps, options } = getWhereVar(entConstr);
    const conditions = processConditions(entConstr, entConstr.conditionsWithoutArrays, true);

    let typeFilters: any[] = [];
    let typeConditions: Quad[] = [];
    if (entConstr.resolveType) {
      typeFilters = genSuperTypesFilter(entConstr, index);
    } else {
      typeConditions = genTypeCondition(entConstr);
    }

    entConstr.query.bgps = [...typeConditions, ...conditions.bgps, ...bgps];
    entConstr.query.options = [...conditions.options, ...options];
    entConstr.query.filters = [...typeFilters, ...conditions.filters];
    entConstr.query.binds = conditions.binds;
  });
  return entConstrs;
}

/**
 *
 * @param entConstrs
 */
function selectQueryFromEntConstr(entConstr: EntConstrInternal) {
  let options: any[] = [];
  // check variables for uniqueness
  const variables = propsToSparqlVars(entConstr);
  entConstr.query.bgps =
    entConstr.query.bgps && entConstr.query.bgps.length > 0 ? [toBgp(entConstr.query.bgps)] : entConstr.query.bgps;
  entConstr.query.options = entConstr.query.options.map((option: any) => toOptional(toBgp(option)));
  // create result query from partial queries
  const where = [...entConstr.query.bgps, ...entConstr.query.filters, ...entConstr.query.binds];
  options = entConstr.query.options;
  return { variables, where, options };
}

/**
 *
 * @param entConstrs
 * @param collConstrJs
 */
function selectQueryFromEntConstrs(entConstrs: EntConstrInternal[], collConstrJs: any) {
  // generate query
  const query: SelectQuery = {
    type: 'query',
    queryType: 'SELECT',
    prefixes: entConstrs[0]?.prefixes || {},
    variables: [],
    where: [],
  };
  let allOptions: any[] = [];
  entConstrs.forEach((entConstr) => {
    const { variables, where, options } = selectQueryFromEntConstr(entConstr);
    // check variables for uniqueness
    let variablesToAdd: Variable[];
    if (query.variables.length === 0) {
      variablesToAdd = variables;
    } else {
      variablesToAdd = [];
      let flag = false;
      variables.forEach((v1) => {
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
    query.variables = [...query.variables, ...variablesToAdd];
    // create result query from partial queries
    query.where = [...(query.where || []), ...where];
    allOptions = [...allOptions, ...options];
  });
  // options should be the latest in WHERE (SPARQL performance optimizations)
  query.where = [...(query.where || []), ...allOptions];
  if (collConstrJs.orderBy) query.order = convertOrderBy(collConstrJs.orderBy, entConstrs);
  if (collConstrJs.limit) query.limit = collConstrJs.limit;
  if (collConstrJs.offset) query.offset = collConstrJs.offset;
  if (collConstrJs.distinct) query.distinct = collConstrJs.distinct;
  return query;
}

/**
 * Converts SPARQL results into one internal JS object according to JSON Schema from entConstr
 * retrieved by schemaIri
 * Also converts RDFS variable values into JSON values
 * @param bindings
 * @param entConstrs
 * @param schemaIri
 */
function sparqlBindingsToObjectBySchemaIri(
  bindings: Bindings,
  entConstrs: EntConstrInternal[],
  schemaIri: string,
): JsObject {
  const index = entConstrs.findIndex((sh) => sh.schema['@id'] === schemaIri);
  if (index >= 0) {
    const entConstr = entConstrs[index];
    if (entConstr.schema['@id'] === schemaIri) {
      return sparqlBindingsToObjectByEntConstr(bindings, entConstr);
    }
  }
  return {};
}

function sparqlBindingsToObjectByEntConstr(bindings: Bindings, entConstr: EntConstrInternal): JsObject {
  const obj: JsObject = {};
  if (entConstr.schema.properties) {
    Object.keys(entConstr.schema.properties).forEach((propKey) => {
      rdfStringValueToObject(obj, propKey, entConstr, bindings);
    });
  }
  // if variables not set, copy all unique prop values from conditions
  if (entConstr.variables === undefined || Object.keys(entConstr.variables).length > 0) {
    if (
      entConstr.variables === undefined ||
      (Object.keys(entConstr.variables).length === 1 && entConstr.variables['@type'])
    ) {
      Object.keys(entConstr.conditions).forEach((propKey) => {
        if (obj[propKey] === undefined) {
          conditionsValueToObject(obj, propKey, entConstr);
        }
      });
    } else {
      // if variables exists, copy only unique prop values which corresponds to variables
      Object.keys(entConstr.conditions).forEach((propKey) => {
        if (obj[propKey] === undefined && entConstr.variables && entConstr.variables[propKey] !== undefined) {
          conditionsValueToObject(obj, propKey, entConstr);
        }
      });
    }
    if (!obj['@type'] && entConstr.schema) obj['@type'] = entConstr.schema.targetClass;
  }
  return obj;
}

/**
 * Converts SPARQL results into internal JS objects according to JSON Schema from EntConstr
 * Also converts RDFS variable values into JSON values
 * @param bindings
 * TODO: Add array properties processing
 */
function sparqlBindingsToObjectProp(bindings: Bindings, entConstrs: EntConstrInternal[]): JsObject {
  const objects: JsObject[] = [];
  entConstrs.forEach((entConstr, entConstrIndex) => {
    objects[entConstrIndex] = sparqlBindingsToObjectByEntConstr(bindings, entConstr);
  });
  if (objects.length === 0) return {};
  if (objects.length === 1) return objects[0];
  // resolve cross-references in data objects
  entConstrs.forEach((entConstrFrom, entConstrFromIndex) => {
    Object.keys(entConstrFrom.conditions).forEach((propFromKey) => {
      if (entConstrFrom.variables === undefined || Object.keys(entConstrFrom.variables).length > 0) {
        let condFrom = entConstrFrom.conditions[propFromKey];
        if (typeof condFrom === 'string' && condFrom.startsWith('?')) {
          condFrom = condFrom.substring(1);
          let entConstrToIndex = entConstrFromIndex;
          do {
            const constrTo = entConstrs[entConstrToIndex];
            const props2vars = constrTo.props2vars;
            const propToKey = Object.keys(props2vars).find((key) => props2vars[key] === condFrom);
            if (propToKey) {
              objects[entConstrFromIndex][propFromKey] = objects[entConstrToIndex][propToKey];
            }
            entConstrToIndex++;
            if (entConstrToIndex >= entConstrs.length) entConstrToIndex = 0;
          } while (entConstrToIndex !== entConstrFromIndex);
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
 * CONSTRUCT
 */

export async function constructObjectsQuery(
  collConstrJs2: ICollConstrJsOpt,
  nsJs: JsStrObj,
  client: SparqlClient,
): Promise<JsObject[]> {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs);
  const query = constructQueryFromEntConstrs(entConstrs, collConstrJs);
  //console.log('constructObjectsQuery  query=', query);
  const queryStr = gen.stringify(query);
  //console.log('constructObjectsQuery  query=', queryStr);
  const results: JsObject[] = await client.sparqlConstruct(queryStr, collConstrJs.options);
  if (!results)
    throw new Error('Collection load error, no response for the CollConstr with @id=' + collConstrJs['@id']);
  let objects: JsObject[] = await jsonLdToObjects(results, entConstrs);
  if (collConstrJs.orderBy && objects?.length > 1) {
    //console.log('before sort', objects, collConstrJs.orderBy);
    objects = sortResults(objects, collConstrJs.orderBy);
    //console.log('after sort', objects, collConstrJs.orderBy);
  }
  return objects;
}
//TODO: replace getWhereVar
export function getWhereProps(
  entConstr: EntConstrInternal,
  requireOptional = false,
): { bgps: Quad[]; options: Quad[] } {
  const bgps: Quad[] = [];
  const options: Quad[] = [];
  Object.keys(entConstr.props).forEach((key) => {
    // filter @id, @type,...
    if (!key.startsWith('@')) {
      const propUri = getSchemaPropUri(entConstr.schema, key);
      const varName = entConstr.props2vars[key];
      if (propUri && varName) {
        const option = getTripleWithPredOrPath(entConstr.subj, propUri, factory.variable(varName), entConstr.prefixes);
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

function processEntConstr(
  entConstrs: EntConstrInternal[],
  entConstr: EntConstrInternal,
  index: number,
  sepaRefQuads = true,
  addType = true,
) {
  const { bgps, options } = getWhereProps(entConstr);
  entConstr.qCond = processConditions(entConstr, entConstr.conditions);
  if (sepaRefQuads) {
    const condBgpsSeparation = separateReferencedQuads(entConstr.qCond.bgps);
    entConstr.qCond.bgps = condBgpsSeparation.nonRefs;
    condBgpsSeparation.refs.forEach((r) => {
      // if child entity (very rough)
      if (r.index > index) {
        const toEntConstr = entConstrs[r.index];
        toEntConstr.query.bgps = [...toEntConstr.query.bgps, r.quad];
        entConstr.query.templates = [...entConstr.query.templates, r.quad];
      } else {
        entConstr.qCond.bgps = [...entConstr.qCond.bgps, r.quad];
      }
    });
    const condOptsSeparation = separateReferencedQuads(entConstr.qCond.options);
    entConstr.qCond.options = condOptsSeparation.nonRefs;
    // make optional condition required in optional block
    condOptsSeparation.refs.forEach((r) => {
      // if child entity (very rough)
      if (r.index > index) {
        const toEntConstr = entConstrs[r.index];
        toEntConstr.query.bgps = [...toEntConstr.query.bgps, r.quad];
        entConstr.query.templates = [...entConstr.query.templates, r.quad];
      } else {
        entConstr.qCond.options = [...entConstr.qCond.options, r.quad];
      }
    });
  }
  // make all conditions mandatory
  entConstr.qCond.bgps = [...entConstr.qCond.bgps, ...entConstr.qCond.options];
  entConstr.qCond.options = [];

  if (entConstr.resolveType) {
    entConstr.qTypeFilters = genSuperTypesFilter(entConstr, index);
    entConstr.qTypeConds = [...entConstr.qTypeConds, ...genTypeCondition(entConstr), entConstr.qTypeFilters[0]];
  } else if (addType) {
    entConstr.qTypeConds = genTypeCondition(entConstr);
  }

  entConstr.query.bgps = [...entConstr.qTypeConds, ...entConstr.query.bgps, ...entConstr.qCond.bgps, ...bgps];
  entConstr.query.options = [...entConstr.query.options, ...entConstr.qCond.options, ...options];
  entConstr.query.filters = [...entConstr.query.filters, ...entConstr.qTypeFilters, ...entConstr.qCond.filters];
  entConstr.query.binds = entConstr.qCond.binds;

  entConstr.bindsVars = entConstr.qCond.bindsVars;
  const bindsVarsTriples = Object.keys(entConstr.qCond.bindsVars).map((key) => {
    const varName = entConstr.qCond.bindsVars[key];
    return factory.quad(entConstr.subj, factory.namedNode(localUrn(key)), factory.variable(varName));
  });
  const { bgps: bgps2 } = getWhereProps(entConstr, true);

  entConstr.query.templates = fixPropPath([
    ...entConstr.qTypeConds,
    ...entConstr.query.templates,
    ...entConstr.qCond.bgps, // conditionsBeforeSeparation
    ...entConstr.qCond.options, // conditionsBeforeSeparation
    ...bgps2,
    ...bindsVarsTriples,
  ]);
}

/**
 *
 * @param entConstrs
 * @param collConstrJs
 */
function constructQueryFromEntConstrs(entConstrs: EntConstrInternal[], collConstrJs: any) {
  analyseProps(entConstrs);
  // numerated query variables
  entConstrs.forEach((entConstr, index) => {
    if (entConstr.schema.properties) {
      if (entConstr.variables) {
        copyUniqueObjectProps(entConstr.query.variables, entConstr.variables);
      } else {
        //copy the rest
        copyUniqueObjectProps(
          entConstr.query.variables,
          copyObjectPropsWithRenameOrFilter(entConstr.schema.properties, entConstr.ignoredProperties),
        );
      }
    }
    if (entConstr.resolveType) {
      if (entConstr.variables === undefined) {
        entConstr.query.variables['@type'] = entConstr.schema.properties['@type'];
        addprops2vars2props(entConstr, '@type', 'type' + index);
      }
    }
    renumerateEntConstrVariables(entConstr, index);
  });
  let isSubqueries = false;
  // if LIMIT extract 1:1 cardinality sub-query in each LIMITed entConstr
  entConstrs = entConstrs.map((entConstr, index) => {
    const entConstrJs = collConstrJs.entConstrs[index];
    if (!entConstrJs.limit || Object.keys(entConstr.schemaPropsWithoutArrays).length === 0) {
      entConstr.props = entConstr.query.variables;
      processEntConstr(entConstrs, entConstr, index, entConstrs.length > 1);
      return entConstr;
    }
    isSubqueries = true;
    const subEntConstr: EntConstrInternal = cloneDeep(entConstr);
    subEntConstr.query.variables = {};
    copyUniqueObjectProps(
      subEntConstr.query.variables,
      copyObjectPropsWithRenameOrFilter(entConstr.schemaPropsWithoutArrays, entConstr.ignoredProperties),
    );
    subEntConstr.props = subEntConstr.query.variables;
    subEntConstr.conditions = entConstr.conditionsWithoutArrays;
    copyUniqueObjectProps(
      entConstr.props,
      copyObjectPropsWithRenameOrFilter(entConstr.schemaPropsWithArrays, entConstr.ignoredProperties),
    );
    entConstr.conditions = entConstr.conditionsWithArrays;
    entConstr.resolveType = false;
    entConstr.subEntConstr = subEntConstr;
    processEntConstr(entConstrs, subEntConstr, index, false);
    processEntConstr(entConstrs, entConstr, index, false, false);
    return entConstr;
  });

  const query: ConstructQuery & {
    //TODO: should be fixed in new sparql.js lib
    order?: Ordering[];
    limit?: number;
    offset?: number;
    distinct?: boolean;
  } = {
    type: 'query',
    queryType: 'CONSTRUCT',
    prefixes: entConstrs[0]?.prefixes || {},
    where: [],
    template: [],
  };
  let allOptions: any[] = [];

  entConstrs.forEach((entConstr, index) => {
    const entConstrJs = collConstrJs.entConstrs[index];
    if (entConstr.subEntConstr) {
      // LIMIT exists, use SELECT subquery
      // array fields breaks LIMIT due to results denormalization
      const {
        variables: variables2,
        where: where2,
        options: options2,
      } = selectQueryFromEntConstr(entConstr.subEntConstr);
      let whereAll2: any[] = [...where2, ...options2];
      const { variables: variables1, where: where1, options: options1 } = selectQueryFromEntConstr(entConstr);
      let whereAll1: any[] = [...where1, ...options1];
      if (entConstrJs.service) {
        whereAll2 = [
          {
            type: 'service',
            patterns: whereAll2,
            name: {
              termType: 'NamedNode',
              value: entConstrJs.service,
            },
            silent: false,
          },
        ];
        whereAll1 = [
          {
            type: 'service',
            patterns: whereAll1,
            name: {
              termType: 'NamedNode',
              value: entConstrJs.service,
            },
            silent: false,
          },
        ];
      }
      const subQuery2: SelectQuery = {
        type: 'query',
        queryType: 'SELECT',
        prefixes: {},
        variables: variables2,
        where: whereAll2,
      };
      if (entConstrJs.orderBy) subQuery2.order = convertOrderBy(entConstrJs.orderBy, entConstr);
      if (entConstrJs.limit) subQuery2.limit = entConstrJs.limit;
      if (entConstrJs.offset) subQuery2.offset = entConstrJs.offset;
      if (entConstrJs.distinct) subQuery2.distinct = entConstrJs.distinct;
      const subQuery1: SelectQuery = {
        type: 'query',
        queryType: 'SELECT',
        prefixes: {},
        variables: variables1,
        //where: whereAll1,
        where: [
          {
            type: 'group',
            patterns: [subQuery2],
          },
          ...whereAll1,
        ],
      };
      query.where = [
        ...(query.where || []),
        {
          type: 'group',
          patterns: [subQuery1],
        },
      ];
      entConstr.query.templates = [...entConstr.subEntConstr.query.templates, ...entConstr.query.templates];
    } else {
      // no LIMIT, proceed with CONSTRUCT (without a subquery)
      entConstr.query.bgps =
        entConstr.query.bgps && entConstr.query.bgps.length > 0 ? [toBgp(entConstr.query.bgps)] : entConstr.query.bgps;
      entConstr.query.options = entConstr.query.options.map((option: any) => toOptional(toBgp(option)));
      //nest referenced entity conditions into parent optional
      if (index > 0 && isReferencedAndOptional(entConstrs, index)) {
        entConstr.query.options = [toOptional([...entConstr.query.bgps, ...entConstr.query.options])];
        entConstr.query.bgps = [];
      }
      // create result query from partial queries
      let where: any[] = [];
      if (isSubqueries) {
        where = [
          ...entConstr.query.bgps,
          ...entConstr.query.filters,
          ...entConstr.query.binds,
          ...entConstr.query.options, // add options to the bottom of the sub-group instead of the global options list
        ];
        if (entConstrJs.service) {
          where = [
            {
              type: 'service',
              patterns: where,
              name: {
                termType: 'NamedNode',
                value: entConstrJs.service,
              },
              silent: false,
            },
          ];
        }
        where = [
          {
            type: 'group',
            patterns: where,
          } as any,
        ];
      } else {
        where = [...entConstr.query.bgps, ...entConstr.query.filters, ...entConstr.query.binds];
        if (entConstrJs.service) {
          where = [
            {
              type: 'service',
              patterns: [...where, ...entConstr.query.options],
              name: {
                termType: 'NamedNode',
                value: entConstrJs.service,
              },
              silent: false,
            },
          ];
        } else {
          allOptions = [...allOptions, ...entConstr.query.options];
        }
      }
      query.where = [...(query.where || []), ...where];
    }
    query.template = [...(query.template || []), ...entConstr.query.templates];
  });

  // options should be the latest in WHERE (SPARQL performance optimizations)
  query.where = [...(query.where || []), ...allOptions];
  if (collConstrJs.orderBy) query.order = convertOrderBy(collConstrJs.orderBy, entConstrs);
  if (collConstrJs.limit) query.limit = collConstrJs.limit;
  if (collConstrJs.offset) query.offset = collConstrJs.offset;
  if (collConstrJs.distinct) query.distinct = collConstrJs.distinct;
  return query;
}

function fixPropPath(templates: any[]) {
  return templates.map((t) =>
    t?.predicate?.type === 'path' && t?.predicate?.pathType === '^'
      ? factory.quad(t.object, t.predicate.items[0], t.subject)
      : t,
  );
}
/**
 *
 * @param entConstrs
 * @param index
 */
function genContext(entConstrs: EntConstrInternal[]): JsObject {
  let context: JsStrObjObj = {};
  for (let index = entConstrs.length - 1; index >= 0; index--) {
    const entConstr = entConstrs[index];
    context = {
      ...context,
      ...entConstr.prefixes,
      ...entConstr.schema['@context'],
    };
  }
  delete context['@type'];
  return context;
}

//const dataTypesIris = ['xsd:string', 'xsd:integer', 'xsd:dateTime', 'rdf:HTML'];

/**
 * TODO: Recursive forward-siblings only
 * @param jsonLdObjs
 * @param entConstrs
 */
function genContextRecursive(entConstrs: EntConstrInternal[], index = 0): JsObject {
  const entConstr = entConstrs[index];
  const context: JsStrObjObj = index === 0 ? { ...entConstr.prefixes } : {};

  const schContext = entConstr.schema['@context'];
  if (schContext) {
    Object.keys(schContext).forEach((key) => {
      let propContext = schContext[key];
      const propSchema: any = entConstr.schema.properties[key];
      if (typeof propContext !== 'string') {
        propContext = { ...propContext };
        if (propSchema?.type === 'string') {
          if (!propSchema.format) {
            if (!propSchema.contentMediaType && propContext['@type']) delete propContext['@type'];
          } else if (propSchema.format === 'iri' && propContext['@type'] !== 'xsd:anyURI') {
            propContext['@type'] = '@id';
          }
        }
      }
      context[key] = propContext;
    });
  }

  Object.keys(entConstr.bindsVars).forEach((key) => {
    const propSchema: any = entConstr.schema.properties[key];
    const propContext: JsObject = {
      '@id': localUrn(key),
    };
    if (propSchema?.type === 'integer') {
      propContext['@type'] = 'xsd:integer';
    } else if (propSchema?.type === 'boolean') {
      propContext['@type'] = 'xsd:boolean';
    } else if (propSchema?.type === 'string') {
      if (propSchema.format === 'date-time') {
        propContext['@type'] = 'xsd:dateTime';
      } else if (propSchema.format === 'iri') {
        propContext['@type'] = 'xsd:anyURI';
      } else {
        propContext['@type'] = 'xsd:string';
      }
    }
    context[key] = propContext;
  });

  delete context['@type'];
  //delete context['rdf'];

  for (index++; index < entConstrs.length; index++) {
    const entConstr2 = entConstrs[index];
    const varName = '?' + entConstr2.props2vars['@id'];
    const conds = entConstr.conditions;
    const refKey = Object.keys(conds).find((key) => (conds[key] === varName ? key : undefined));
    if (refKey) {
      const refVal = context[refKey];
      //const type = entConstr2.schema['@type'] || 'rdf:Resource';
      if (typeof refVal === 'string') {
        context[refKey] = {
          '@id': refVal,
          //'@type': type,
          '@context': {
            ...genContextRecursive(entConstrs, index),
          },
        };
      } else {
        context[refKey] = {
          ...refVal,
          //'@type': type,
          '@context': {
            ...genContextRecursive(entConstrs, index),
          },
        };
      }
    }
  }
  return context;
}

/**
 * Look from last to first ctx
 * @param ctxs
 */
function getPropFromCtxs(key: string, ctxs?: JsStrObjObj[]) {
  let prop = undefined;
  if (ctxs) {
    for (let index = ctxs.length - 1; index > -1; index--) {
      const ctx = ctxs[index];
      prop = ctx[key];
      if (prop) break;
    }
  }
  return prop;
}

function convertSimpleTypes(val: string, type?: string) {
  if (type) {
    if (
      type === 'xsd:integer' ||
      type === 'xsd:int' ||
      type === 'xsd:long' ||
      type === 'xsd:byte' ||
      type === 'xsd:short'
    ) {
      return parseInt(val, 10);
    } else if (type === 'xsd:boolean') {
      if (val === 'true') return true;
      if (val === 'false') return false;
    } else if (type === 'xsd:double' || type === 'xsd:float' || type === 'xsd:decimal') {
      return parseFloat(val);
    } else if (
      type === 'xsd:unsignedByte' ||
      type === 'xsd:unsignedShort' ||
      type === 'xsd:unsignedInt' ||
      type === 'xsd:unsignedLong' ||
      type === 'xsd:positiveInteger' ||
      type === 'xsd:nonNegativeInteger' ||
      type === 'xsd:negativeInteger' ||
      type === 'xsd:nonPositiveInteger'
    ) {
      return parseInt(val, 10);
    }
  }
  return val;
}

function convertAnyTypes(val: any, type?: string, ctxs?: JsStrObjObj[]) {
  if (typeof val === 'string') {
    val = convertSimpleTypes(val, type);
  } else if (isArray(val)) {
    val = val.map((subVal) => convertAnyTypes(subVal, type, ctxs));
  } else {
    val = convertPropValues(val, ctxs);
  }
  return val;
}

function convertPropValues(obj: JsObject, ctxs?: JsStrObjObj[]) {
  if (!ctxs) {
    const ctx = obj['@context'];
    if (ctx) ctxs = [ctx];
  }
  Object.keys(obj).forEach((key) => {
    if (ctxs && key !== '@context') {
      const localCtx = getPropFromCtxs(key, ctxs);
      if (localCtx) {
        if (typeof localCtx === 'object') {
          const type: string | JsStrObjObj | undefined = localCtx['@type'];
          const localCtxCtx = localCtx['@context'];
          if (localCtxCtx && typeof localCtxCtx === 'object') ctxs.push(localCtxCtx);
          if ((type && typeof type === 'string') || type === undefined) {
            const val = obj[key];
            obj[key] = convertAnyTypes(val, type, ctxs);
          }
        }
      }
    }
  });
  return obj;
}

function nestObjs(jsonLdObjs: JsObject[], entConstrs: EntConstrInternal[]) {
  const entsObjs: JsObject[][] = [];
  entConstrs.forEach((entConstr, indexEntConstr) => {
    const fullClassIri = deAbbreviateIri(entConstr.schema.targetClass, entConstr.prefixes);
    const dd = jsonLdObjs.filter((obj) => {
      const types: string[] = obj['@type'];
      if (types.length === 1) return types[0] === fullClassIri;
      else {
        const typeIndex = types.findIndex((t) => t === fullClassIri);
        if (typeIndex !== -1) {
          if (entConstr.resolveType) types.splice(typeIndex, 1);
          return true;
        }
        return false;
      }
    });
    entsObjs[indexEntConstr] = dd;
  });
  if (!entsObjs || entsObjs[0].length === 0) return jsonLdObjs;
  entConstrs.forEach((entConstr, entConstrFromIndex) => {
    Object.keys(entConstr.relatedTo).forEach((prop) => {
      const entConstrToIndex = entConstr.relatedTo[prop];
      const context = entConstr.schema['@context'];
      if (context) {
        let propIri = context[prop];
        if (typeof propIri === 'object') propIri = propIri['@id'];
        if (propIri) {
          const fullPropIri = deAbbreviateIri(propIri as string, entConstr.prefixes);
          entsObjs[entConstrFromIndex].forEach((entObjFrom) => {
            const entObjFromPropVals = entObjFrom[fullPropIri];
            if (isArray(entObjFromPropVals)) {
              entObjFromPropVals.forEach((entObjFromPropVal, opvIndex) => {
                const refIri = entObjFromPropVal['@id'];
                if (refIri) {
                  entObjFromPropVals[opvIndex] = entsObjs[entConstrToIndex].find(
                    (entObjTo) => entObjTo['@id'] === refIri,
                  );
                }
              });
            }
          });
        } else {
          propIri = context[prop];
          if (typeof propIri === 'object') {
            propIri = propIri['@reverse'];
            if (propIri) {
              const fullPropIri = deAbbreviateIri(propIri as string, entConstr.prefixes);
              entsObjs[entConstrFromIndex].forEach((entObjFrom) => {
                const refIri = entObjFrom['@id'];
                const toObjs = entsObjs[entConstrToIndex].filter((entObjTo) => {
                  const prop = entObjTo[fullPropIri];
                  if (!prop) return false;
                  const v = prop[0]['@id'] === refIri;
                  return v;
                });
                toObjs.forEach((toObj) => {
                  delete toObj[fullPropIri];
                });
                if (!entObjFrom['@reverse']) entObjFrom['@reverse'] = {};
                entObjFrom['@reverse'] = {
                  ...entObjFrom['@reverse'],
                  [fullPropIri]: toObjs,
                };
              });
            }
          }
        }
      }
    });
  });
  return entsObjs[0];
}

async function jsonLdToObjects(jsonLdObjs: JsObject[], entConstrs: EntConstrInternal[]): Promise<JsObject[]> {
  const context = genContextRecursive(entConstrs);
  const jsonLdObjsNested = nestObjs(jsonLdObjs, entConstrs);
  const objects: JsObject[] = [];
  for (const jsonLdObj of jsonLdObjsNested) {
    const compacted = await jsonld.compact(jsonLdObj, context);
    const converted = convertPropValues(compacted);
    delete converted['@context'];
    objects.push(converted);
  }
  return objects;
}
