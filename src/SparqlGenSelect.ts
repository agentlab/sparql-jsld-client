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
import { cloneDeep } from 'lodash';
import { Quad, Term, NamedNode, Variable } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
import { ConstructQuery, Ordering, Pattern, SelectQuery } from 'sparqljs';
import jsonld from 'jsonld';

import { Bindings, Results, SparqlClient } from './SparqlClient';
import {
  JsObject,
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
  JsStrObjObj,
  JSONSchema6forRdf,
} from './ObjectProvider';
import {
  addprops2vars2props,
  genTypeCondition,
  conditionsValueToObject,
  genSuperTypesFilter,
  EntConstrInternal,
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
  localUrn
} from './SparqlGen';



export async function constructObjectsQuery(collConstrJs2: ICollConstrJsOpt, nsJs: any, client: SparqlClient) {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs);
  const query = constructQueryFromEntConstrs(entConstrs, collConstrJs);
  const queryStr = gen.stringify(query);
  //console.log('constructObjectsQuery  query=', queryStr);
  const results: JsObject[] = await client.sparqlConstruct(queryStr, collConstrJs.options);
  const objects: JsObject[] = await jsonLdToObjects(results, entConstrs);
  return objects;
}

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

export async function selectObjectsArrayProperties(entConstrs: EntConstrInternal[], objects: JsObject[], client: SparqlClient) {
  //console.debug('selectObjectsArrayProperties');
  for(let index = 0; index < entConstrs.length; index++){
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
          if ((prop.type === 'array' && prop.items) || (prop.type === 'object')) {
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
                      variables: {},// ignore schema props in SELECT xxx variables
                    },
                    {
                      schema: schema2,
                    }
                  ]
                },
                entConstr.prefixes, client
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


/**
 * SELECT
 */

/**
 * 
 * @param entConstrs 
 * @param prefixes 
 */
function selectInternalEntConstrs(entConstrs: EntConstrInternal[]) {
  entConstrs.forEach((entConstr, index) => {
    entConstr.query.variables = {};
    if (entConstr.schema.properties) {
      // if variables not set, copy all from schema except @type
      // copy as variables: all non-conditional properties, properties with "extended filter functions" or "bindings"
      // did not copy properties with conditions with values or reference ?xxx variables
      const ignoredProperties: JsObject = {
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
          ignoredProperties[key] = null;
      });
      const properties = entConstr.schema.properties;
      // if EntConstr has only conditions and array property then did not make subquery
      //extract array variables into subquery
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
      if (entConstr.variables) {
        copyUniqueObjectProps(entConstr.query.variables, entConstr.variables);
      } else {
        //copy the rest
        copyUniqueObjectProps(
          entConstr.query.variables,
          copyObjectPropsWithRenameOrFilter(entConstr.schemaPropsWithoutArrays, ignoredProperties),
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

    entConstr.query.bgps = [
      ...typeConditions,
      ...conditions.bgps,
      ...bgps,
    ];
    entConstr.query.options = [
      ...conditions.options,
      ...options,
    ];
    entConstr.query.filters = [
      ...typeFilters,
      ...conditions.filters,
    ];
    entConstr.query.binds = conditions.binds;
  });
  return entConstrs;
}

/**
 * 
 * @param entConstrs 
 * @param prefixes 
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
    // check variables for uniquiness
    const generatedVariables = propsToSparqlVars(entConstr);
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
    query.variables = [
      ...query.variables,
      ...variablesToAdd
    ];
    entConstr.query.bgps = entConstr.query.bgps && entConstr.query.bgps.length > 0 ? [toBgp(entConstr.query.bgps)] : entConstr.query.bgps;
    entConstr.query.options = entConstr.query.options.map((option: any) => toOptional(toBgp(option)));
    // create result query from partial queries
    query.where = [
      ...query.where || [],
      ...entConstr.query.bgps,
      ...entConstr.query.filters || [],
      ...entConstr.query.binds || [],
    ];
    allOptions = [...allOptions, ...entConstr.query.options || []];
  });
  // options should be the latest in WHERE (SPARQL performance optimizations)
  query.where = [
    ...query.where || [],
    ...allOptions,
  ];
  if (collConstrJs.orderBy) query.order = collConstrJs.orderBy;
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
function sparqlBindingsToObjectBySchemaIri(bindings: Bindings, entConstrs: EntConstrInternal[], schemaIri: string): JsObject {
  const index = entConstrs.findIndex((sh) => sh.schema['@id'] === schemaIri);
  if (index >= 0) {
    const entConstr = entConstrs[index];
    if(entConstr.schema['@id'] === schemaIri) {
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
  if (entConstr.variables === undefined ||  Object.keys(entConstr.variables).length > 0) {
    if (entConstr.variables === undefined || (Object.keys(entConstr.variables).length === 1 && entConstr.variables['@type'])) {
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
      if (entConstrFrom.variables === undefined ||  Object.keys(entConstrFrom.variables).length > 0) {
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

/**
 * 
 * @param entConstrs 
 * @param prefixes 
 */
function constructQueryFromEntConstrs(entConstrs: EntConstrInternal[], collConstrJs: any) {
  entConstrs.forEach((entConstr, index) => {
    entConstr.query.variables = {};
    if (entConstr.schema.properties) {
      // if variables not set, copy all from schema except @type
      // copy as variables: all non-conditional properties, properties with "extended filter functions" or "bindings"
      // did not copy properties with conditions with values or reference ?xxx variables
      const ignoredProperties: JsObject = {
        '@type': null,
        //targetClass: null,
      };
      const conditions = entConstr.conditions;
      Object.keys(conditions).forEach((key) => {
        const filterProperty = conditions[key];
        if (filterProperty.value === undefined && filterProperty.relation === undefined && filterProperty.bind === undefined) {
          ignoredProperties[key] = null;
        }
      });
      if (entConstr.variables) {
        copyUniqueObjectProps(entConstr.query.variables, entConstr.variables);
      } else {
        //copy the rest
        copyUniqueObjectProps(
          entConstr.query.variables,
          copyObjectPropsWithRenameOrFilter(entConstr.schema.properties, ignoredProperties)
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
    const conditions = processConditions(entConstr, entConstr.conditions);
    const conditionsBeforeSeparation = {...conditions};
    if (entConstrs.length > 1) {
      const condBgpsSeparation = separateReferencedQuads(conditions.bgps);
      conditions.bgps = condBgpsSeparation.nonRefs;
      condBgpsSeparation.refs.forEach((r) => entConstrs[r.index].query.bgps = [...entConstrs[r.index].query.bgps || [], r.quad]);

      const condOptsSeparation = separateReferencedQuads(conditions.options);
      conditions.options = condOptsSeparation.nonRefs;
      // make optional condition required in optional block
      condOptsSeparation.refs.forEach((r) => entConstrs[r.index].query.bgps = [...entConstrs[r.index].query.bgps || [], r.quad]);
    }
    // make all conditions mandatory
    conditions.bgps = [...conditions.bgps, ...conditions.options];
    conditions.options = [];

    let typeFilters: any[] = [];
    let typeConditions: Quad[] = [];
    if (entConstr.resolveType) {
      typeFilters = genSuperTypesFilter(entConstr, index);
      typeConditions = [
        ...genTypeCondition(entConstr),
        typeFilters[0]
      ];
    } else {
      typeConditions = genTypeCondition(entConstr);
    }

    entConstr.query.bgps = [
      ...entConstr.query.bgps || [],
      ...typeConditions,
      ...conditions.bgps,
      ...bgps,
    ];
    entConstr.query.options = [
      ...entConstr.query.options || [],
      ...conditions.options,
      ...options,
    ];
    entConstr.query.filters = [
      ...entConstr.query.filters || [],
      ...typeFilters,
      ...conditions.filters,
    ];
    entConstr.query.binds = conditions.binds;

    entConstr.bindsVars = conditions.bindsVars;
    const bindsVarsTriples = Object.keys(conditions.bindsVars).map((key) => {
      const varName = conditions.bindsVars[key];
      return triple(entConstr.subj, namedNode(localUrn(key)), variable(varName));
    });
    const { bgps: bgps2 } = getWhereVar(entConstr, true);
    
    entConstr.query.templates = [
      ...typeConditions,
      ...conditionsBeforeSeparation.bgps,
      ...conditionsBeforeSeparation.options,
      ...bgps2,
      ...bindsVarsTriples,
    ];
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
    entConstr.query.bgps = entConstr.query.bgps && entConstr.query.bgps.length > 0 ? [toBgp(entConstr.query.bgps)] : entConstr.query.bgps;
    entConstr.query.options = entConstr.query.options.map((option: any) => toOptional(toBgp(option)));
    //nest referenced entity conditions into parent optional
    if (index > 0 && isReferencedAndOptional(entConstrs, index)) {
      entConstr.query.options = [
        toOptional([
          ...entConstr.query.bgps,
          ...entConstr.query.options,
        ])
      ];
      entConstr.query.bgps = [];
    }
    // create result query from partial queries
    query.where = [
      ...query.where || [],
      ...entConstr.query.bgps,
      ...entConstr.query.filters || [],
      ...entConstr.query.binds || [],
    ];
    allOptions = [...allOptions, ...entConstr.query.options || []];
    query.template = [
      ...query.template || [],
      ...entConstr.query.templates || [],
    ];
  });

  // options should be the latest in WHERE (SPARQL performance optimizations)
  query.where = [
    ...query.where || [],
    ...allOptions,
  ];
  if (collConstrJs.orderBy) query.order = collConstrJs.orderBy;
  if (collConstrJs.limit) query.limit = collConstrJs.limit;
  if (collConstrJs.offset) query.offset = collConstrJs.offset;
  if (collConstrJs.distinct) query.distinct = collConstrJs.distinct;
  return query;
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
function genContextRecursive(entConstrs: EntConstrInternal[], index: number = 0): JsObject {
  const entConstr = entConstrs[index];
  const context: JsStrObjObj = (index === 0) ? { ...entConstr.prefixes } : {};

  const schContext = entConstr.schema['@context'];
  if (schContext) {
    Object.keys(schContext).forEach((key) => {
      let propContext = schContext[key];
      const propSchema: any = entConstr.schema.properties[key];
      if (typeof propContext !== 'string') {
        propContext = { ...propContext };
        if (propSchema?.type === 'string'){
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
    let propContext: JsObject = {
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

  index++;
  if (index < entConstrs.length) {
    const entConstr2 = entConstrs[index];
    const varName = '?' + entConstr2.props2vars['@id'];
    const conds = entConstr.conditions;
    const refKey = Object.keys(conds).find((key) => (conds[key] === varName) ? key : undefined);
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
        }
      } else {
        context[refKey] = {
          ...refVal,
          //'@type': type,
          '@context': {
            ...genContextRecursive(entConstrs, index),
          },
        }
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
    for (let index = ctxs.length - 1; index > -1 ; index--) {
      const ctx = ctxs[index];
      prop = ctx[key];
      if (prop) break;
    }
  }
  return prop;
}

function convertSimpleTypes(val: string, type?: string) {
  if (type) {
    if (type === 'xsd:integer' || type === 'xsd:int') {
      return parseInt(val, 10);
    } else if (type === 'xsd:boolean') {
      if (val === 'true') return true;
      if (val === 'false') return false;
    } else if (type === 'xsd:double' || type === 'xsd:float') {
      return parseFloat(val);
    }
  }
  return val;
}

function convertAnyTypes(val: any, type?: string, ctxs?: JsStrObjObj[]) {
  if (typeof val === 'string') {
    val = convertSimpleTypes(val, type);
  } else if (Array.isArray(val)) {
    val = val.map((subVal) => convertAnyTypes(subVal, type, ctxs));
  } else {
    val = convertObjectTypes(val, ctxs);
  }
  return val;
}

function convertObjectTypes(obj: JsObject, ctxs?: JsStrObjObj[]) {
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
          if (type && typeof type === 'string' || type === undefined) {
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
      if (types.length === 1)
        return types[0] === fullClassIri;
      else {
        const typeIndex = types.findIndex(t => t === fullClassIri);
        if (typeIndex !== -1) {
          if (entConstr.resolveType)
            types.splice(typeIndex, 1);
          return true;
        }
        return false;
      }
    });
    entsObjs[indexEntConstr] = dd;
  });
  if (!entsObjs || entsObjs[0].length === 0) return jsonLdObjs;
  entConstrs.forEach((entConstr, indexEntConstr) => {
    Object.keys(entConstr.relatedTo).forEach((prop) => {
      const indexEntConstr2 = entConstr.relatedTo[prop];
      const context = entConstr.schema['@context'];
      if (context) {
        let propIri = context[prop];
        if (typeof propIri === 'object') propIri = propIri['@id'];
        const fullPropIri = deAbbreviateIri(propIri as string, entConstr.prefixes);
        entsObjs[indexEntConstr].forEach((obj => {
          const objProp = obj[fullPropIri];
          if (Array.isArray(objProp)) {
            objProp.forEach((op, opIndex) => {
              const refIri = op['@id'];
              if (refIri) {
                objProp[opIndex] = entsObjs[indexEntConstr2].find((obj2) => obj2['@id'] === refIri);
              }
            });
          }
        }));
      }
    });
  });
  return entsObjs[0];
}

//let num = 1;

async function jsonLdToObjects(jsonLdObjs: JsObject[], entConstrs: EntConstrInternal[]): Promise<JsObject[]> {
  const objects: JsObject[] = [];
  const context = genContextRecursive(entConstrs);
  /*context.property = {
    ...context.property,
    '@container': '@list',
  };*/
  //context.property = context.property['@id'];
  //console.log(context);

  jsonLdObjs = nestObjs(jsonLdObjs, entConstrs);
  
  for (const jsonLdObj of jsonLdObjs) {
    //console.log('jsonLdToObjects+' + num);
    //if (num > 2) {
    //  console.log(context);
    //}
    //num++;
    const compacted = await jsonld.compact(jsonLdObj, context);
    const converted = convertObjectTypes(compacted);
    delete converted['@context'];
    objects.push(converted);
  }
  return objects;
}
