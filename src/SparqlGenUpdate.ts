/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import cloneDeep from 'lodash/cloneDeep';
import { AxiosResponse } from 'axios';

import { triple, variable } from '@rdfjs/data-model';
import { Update } from 'sparqljs';

import { JsObject } from 'ObjectProvider';
import { SparqlClient } from 'SparqlClient';
import {
  addprops2vars2props,
  addTo,
  addToBgp,
  addToResult,
  EntConstrInternal,
  gen,
  genUniqueVarName,
  getDataTriples,
  getInternalCollConstrs,
  getTypeCondition,
  getWhereVar,
  getWhereVarFromDataWithoutOptinals,
  ICollConstrJsOpt,
  processConditions,
  renumerateEntConstrVariables
} from './SparqlGen';


export async function deleteObjectQuery(collConstrJs2: ICollConstrJsOpt, nsJs: any, client: SparqlClient, conditions?: JsObject | JsObject[]) {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs, conditions);
  const query = deleteObjectQueryFromEntConstrs(entConstrs);
  const queryStr = gen.stringify(query);
  //console.debug('deleteObject query=', queryStr);
  const response: AxiosResponse<any> = await client.sparqlUpdate(queryStr, collConstrJs.options);
}

export async function insertObjectQuery(collConstrJs2: ICollConstrJsOpt, nsJs: any, client: SparqlClient, data?: JsObject | JsObject[]) {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs, undefined, data);
  const query = insertObjectQueryFromEntConstrs(entConstrs);
  const queryStr = gen.stringify(query);
  //console.debug('createObject query=', queryStr);
  const response: AxiosResponse<any> = await client.sparqlUpdate(queryStr, collConstrJs.options);
}

export async function updateObjectQuery(collConstrJs2: ICollConstrJsOpt, nsJs: any, client: SparqlClient, conditions?: JsObject | JsObject[], data?: JsObject | JsObject[]) {
  //TODO: performance
  const collConstrJs: ICollConstrJsOpt = cloneDeep(collConstrJs2);
  const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, nsJs, conditions, data);
  const query = updateObjectQueryFromEntConstrs(entConstrs);
  const queryStr = gen.stringify(query);
  //console.debug('createObject query=', queryStr);
  const response: AxiosResponse<any> = await client.sparqlUpdate(queryStr, collConstrJs.options);
}

/**
 * DELETE
 * 
 * @param entConstrs 
 * @param prefixes 
 */
function deleteObjectQueryFromEntConstrs(entConstrs: EntConstrInternal[]) {
  const query: Update = {
    type: 'update',
    prefixes: entConstrs[0]?.prefixes || {},
    updates: [
      {
        updateType: 'insertdelete',
        delete: [],
        insert: [],
      },
    ],
  };
  entConstrs.forEach((entConstr, index) => {
    entConstr.query.variables = {
      ...entConstr.conditions,
    };
    //renumerate variables to avoid collisions in SPARQL query
    Object.keys(entConstr.query.variables).forEach((key) => {
      if (!entConstr.props2vars[key]) addprops2vars2props(entConstr, key, key + index);
    });
    const pVarName = genUniqueVarName('p', index, entConstrs);
    const oVarName = genUniqueVarName('o', index, entConstrs);
    addTo(query.updates[0], 'delete', addToBgp([triple(entConstr.subj, variable(pVarName), variable(oVarName))]));

    let { bgps, options } = getWhereVar(entConstr, true);
    let filters: any[] = [];
    let binds: any[] = [];
    bgps = [
      ...getTypeCondition(entConstr),
      triple(entConstr.subj, variable(pVarName), variable(oVarName)),
      ...bgps
    ];
    // if element has URI -- its enough otherwise we need to add other conditions
    if (!entConstr.conditions['@id']) {
      const whereConditions = processConditions(entConstr, entConstr.conditions, true);
      bgps = [...whereConditions.bgps, ...bgps];
      options = [...whereConditions.options, ...options];
      filters = whereConditions.filters;
      binds = whereConditions.binds;
    }
    // TODO: create result query from partial queries
    //entConstr.query.bgps = bgps;
    //entConstr.query.options = options;
    //entConstr.query.filters = filters;
    const results: any[] = [];
    addToResult(results, bgps, options, filters, binds);
    addTo(query.updates[0], 'where', results);
  });
  return query;
}

/**
 * INSERT
 */
function insertObjectQueryFromEntConstrs(entConstrs: EntConstrInternal[]) {
  const query: Update = {
    type: 'update',
    prefixes: entConstrs[0]?.prefixes || {},
    updates: [
      {
        updateType: 'insert',
        insert: [],
      },
    ],
  };
  entConstrs.forEach((entConstr) => {
    const triples = getTypeCondition(entConstr)
      .concat(getDataTriples(entConstr));
    addTo(query.updates[0], 'insert', addToBgp(triples));
  });
  return query;
}

/**
 * UPDATE
 */
function updateObjectQueryFromEntConstrs(entConstrs: EntConstrInternal[]) {
  const query: Update = {
    type: 'update',
    prefixes: entConstrs[0]?.prefixes || {},
    updates: [
      {
        updateType: 'insertdelete',
        delete: [],
        insert: [],
      },
    ],
  };
  entConstrs.forEach((entConstr, index) => {
    addTo(query.updates[0], 'insert', addToBgp(getDataTriples(entConstr)));
    entConstr.query.variables = {
      ...entConstr.conditions,
      ...entConstr.data,
    };
    renumerateEntConstrVariables(entConstr, index);
    addTo(query.updates[0], 'delete', getWhereVarFromDataWithoutOptinals(entConstr));

    let { bgps, options } = getWhereVar(entConstr);
    let filters: any[] = [];
    let binds: any[] = [];
    bgps = [
      ...getTypeCondition(entConstr),
      ...bgps
    ];
    // if element has URI -- its enough otherwise we need to add other conditions
    if (!entConstr.conditions['@id']) {
      const whereConditions = processConditions(entConstr, entConstr.conditions, true);
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
}
