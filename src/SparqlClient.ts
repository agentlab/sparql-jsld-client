/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import axios, { AxiosResponse } from 'axios';
import { Term } from 'rdf-js';
import { JsObject, json2str } from './ObjectProvider';

export interface ServerResponse {
  head: {
    vars: string[];
  };
  results: Results;
}
export interface Bindings {
  [key: string]: Term;
}
export interface Results {
  bindings: Bindings[];
}

export interface FileUploadConfig {
  file: string;
  baseURI: string;
  graph?: string;
}

/**
 *
 * @param url
 * @param queryParams
 */
export async function sendGet(url: string, queryParams: JsObject = {}): Promise<AxiosResponse<ServerResponse>> {
  let queryParamsInUrl = '';
  if (Object.keys(queryParams).length > 0) {
    queryParamsInUrl = `?${Object.keys(queryParams)
      .map((param) => `${param}=${queryParams[param]}`)
      .join('&')}`;
  }
  url = url + queryParamsInUrl;
  try {
    const response = await axios.request<ServerResponse>({
      method: 'get',
      url,
      headers: {
        Accept: 'application/sparql-results+json',
      },
    });
    return response;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('sendGet: Response error', error);
      //console.info('sendGet: response=' + error.response);
      console.info('sendGet: response.data' + json2str(error.response.data));
      console.info('sendGet: response.status' + error.response.status);
      console.info('sendGet: response.headers' + json2str(error.response.headers));
      //const data = error.request;
      //const msg = 'sendGet: request=';
      //console.info('sendGet: request.data=' + json2str(error.request.data));
      console.info('sendGet: request.uri' + error.request.uri);
      console.info('sendGet: request.data' + json2str(error.request.data));
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.error('sendGet: Request error', error);
      console.info('sendGet: error.request=' + json2str(error.request));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('sendGet: Send error', error);
      console.info('sendGet: error.message=' + error.message);
    }
    console.info('sendGet: error.config=' + json2str(error.config));
    return Promise.reject(error);
  }
}

/**
 *
 * @param url
 * @param query
 * @param queryParams
 */
export async function sendPostQuery(
  url: string,
  query: string,
  queryParams: JsObject = {},
): Promise<AxiosResponse<ServerResponse>> {
  let queryParamsInUrl = '';
  if (Object.keys(queryParams).length > 0) {
    queryParamsInUrl = `?${Object.keys(queryParams)
      .map((param) => `${param}=${queryParams[param]}`)
      .join('&')}`;
  }
  url = url + queryParamsInUrl;
  try {
    const response = await axios.request<ServerResponse>({
      method: 'post',
      url,
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/sparql-query;charset=UTF-8',
      },
      data: query,
      //transformResponse: (r) => r.data
    });
    return response;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('sendPostQuery: Response error', error);
      //console.info('sendPostQuery: response=' + error.response);
      console.info('sendPostQuery: response.data' + json2str(error.response.data));
      console.info('sendPostQuery: response.status' + error.response.status);
      console.info('sendPostQuery: response.headers' + json2str(error.response.headers));
      //const data = error.request;
      //const msg = 'sendPostQuery: request=';
      //console.info('sendPostQuery: request.data=' + json2str(error.request.data));
      console.info('sendPostQuery: request.uri' + error.request.uri);
      console.info('sendPostQuery: request.data' + json2str(error.request.data));
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.error('sendPostQuery: Request error', error);
      console.info('sendPostQuery: error.request=' + json2str(error.request));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('sendPostQuery: Send error', error);
      console.info('sendPostQuery: error.message=' + error.message);
    }
    console.info('sendPostQuery: error.config=' + json2str(error.config));
    return Promise.reject(error);
  }
}

export async function sendPostStatements(
  url: string,
  data: string,
  queryParams: JsObject = {},
): Promise<AxiosResponse<ServerResponse>> {
  let queryParamsInUrl = '';
  if (Object.keys(queryParams).length > 0) {
    queryParamsInUrl = `?${Object.keys(queryParams)
      .map((param) => `${param}=${encodeURIComponent(queryParams[param])}`)
      .join('&')}`;
  }
  url = url + queryParamsInUrl;
  try {
    const response = await axios.request<ServerResponse>({
      method: 'post',
      url,
      headers: {
        Accept: '*',
        'Content-Type': 'text/turtle;charset=UTF-8',
      },
      data: data,
      //transformResponse: (r) => r.data
    });
    return response;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('sendPostQuery: Response error', error);
      //console.info('sendPostQuery: response=' + error.response);
      console.info('sendPostQuery: response.data' + json2str(error.response.data));
      console.info('sendPostQuery: response.status' + error.response.status);
      console.info('sendPostQuery: response.headers' + json2str(error.response.headers));
      //const data = error.request;
      //const msg = 'sendPostQuery: request=';
      //console.info('sendPostQuery: request.data=' + json2str(error.request.data));
      console.info('sendPostQuery: request.uri' + error.request.uri);
      console.info('sendPostQuery: request.data' + json2str(error.request.data));
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.error('sendPostQuery: Request error', error);
      console.info('sendPostQuery: error.request=' + json2str(error.request));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('sendPostQuery: Send error', error);
      console.info('sendPostQuery: error.message=' + error.message);
    }
    console.info('sendPostQuery: error.config=' + json2str(error.config));
    return Promise.reject(error);
  }
}

/**
 * Adds prefixes and executes query
 * @param {*} url
 * @param {*} query
 */
export async function executeUpdate(url: string, query: string, queryParams: JsObject = {}): Promise<AxiosResponse> {
  let queryParamsInUrl = '';
  if (Object.keys(queryParams).length > 0) {
    queryParamsInUrl = `?${Object.keys(queryParams)
      .map((param) => `${param}=${encodeURIComponent(queryParams[param])}`)
      .join('&')}`;
  }
  url = url + queryParamsInUrl;
  const response = await axios.request<AxiosResponse>({
    method: 'post',
    url,
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: `update=${encodeURIComponent(query)}`,
  });
  return response;
}

export function createRepositoryConfig(repParam: JsObject = {}, repType: string = 'native-rdfs'): string {
  if (repType === 'native-rdfs')
    return `
  #
  # Sesame configuration template for a native RDF repository with
  # RDF Schema inferencing
  #
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
  @prefix rep: <http://www.openrdf.org/config/repository#>.
  @prefix sr: <http://www.openrdf.org/config/repository/sail#>.
  @prefix sail: <http://www.openrdf.org/config/sail#>.
  @prefix ns: <http://www.openrdf.org/config/sail/native#>.
  @prefix sb: <http://www.openrdf.org/config/sail/base#>.
        
  [] a rep:Repository ;
    rep:repositoryID "${repParam['Repository ID']}" ;
    rdfs:label "${repParam['Repository title'] || 'Native store with RDF Schema inferencing'}" ;
    rep:repositoryImpl [
      rep:repositoryType "openrdf:SailRepository" ;
      sr:sailImpl [
          sail:sailType "rdf4j:SchemaCachingRDFSInferencer" ;
          sail:delegate [
            sail:sailType "openrdf:NativeStore" ;
            sail:iterationCacheSyncThreshold "${repParam['Query Iteration Cache size'] || 10000}";
            ns:tripleIndexes "${repParam['Triple indexes'] || 'spoc,posc'}";
            sb:evaluationStrategyFactory "${repParam['EvaluationStrategyFactory'] ||
              'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'}"
          ]
        ]
    ].
  `;
  if (repType === 'native-rdfs-dt')
    return `
  #
  # Sesame configuration template for a native RDF repository with
  # RDF Schema and direct type hierarchy inferencing
  #
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
  @prefix rep: <http://www.openrdf.org/config/repository#>.
  @prefix sr: <http://www.openrdf.org/config/repository/sail#>.
  @prefix sail: <http://www.openrdf.org/config/sail#>.
  @prefix ns: <http://www.openrdf.org/config/sail/native#>.
  @prefix sb: <http://www.openrdf.org/config/sail/base#>.
        
  [] a rep:Repository ;
    rep:repositoryID "${repParam['Repository ID']}" ;
    rdfs:label "${repParam['Repository title'] || 'Native store with RDF Schema and direct type inferencing'}" ;
    rep:repositoryImpl [
      rep:repositoryType "openrdf:SailRepository" ;
      sr:sailImpl [
        sail:sailType "openrdf:DirectTypeHierarchyInferencer" ;
        sail:delegate [
          sail:sailType "rdf4j:SchemaCachingRDFSInferencer" ;
          sail:delegate [
            sail:sailType "openrdf:NativeStore" ;
            sail:iterationCacheSyncThreshold "${repParam['Query Iteration Cache size'] || 10000}";
            ns:tripleIndexes "${repParam['Triple indexes'] || 'spoc,posc'}";
            sb:evaluationStrategyFactory "${repParam['EvaluationStrategyFactory'] ||
              'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'}"
          ]
        ]
      ]
    ].
  `;
  if (repType === 'native-rdfs-dt-shacl')
    return `
  #
  # Sesame configuration template for a native RDF repository with
  # RDF Schema inferencing
  #
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
  @prefix rep: <http://www.openrdf.org/config/repository#>.
  @prefix sail: <http://www.openrdf.org/config/sail#>.
  @prefix sail-shacl: <http://rdf4j.org/config/sail/shacl#> .
  @prefix ns: <http://www.openrdf.org/config/sail/native#>.
  @prefix sb: <http://www.openrdf.org/config/sail/base#>.
  @prefix sr: <http://www.openrdf.org/config/repository/sail#>.
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
        
  [] a rep:Repository ;
    rep:repositoryID "${repParam['Repository ID']}" ;
    rdfs:label "${repParam['Repository title'] || 'Native store with RDF Schema inferencing'}" ;
    rep:repositoryImpl [
      rep:repositoryType "openrdf:SailRepository" ;
      sr:sailImpl [
        sail:sailType "rdf4j:SparqledShaclSail" ;
        sail:delegate [
          sail:sailType "openrdf:DirectTypeHierarchyInferencer" ;
          sail:delegate [
            sail:sailType "rdf4j:SchemaCachingRDFSInferencer" ;
            sail:delegate [
              sail:sailType "openrdf:NativeStore" ;
              sail:iterationCacheSyncThreshold "${repParam['Query Iteration Cache size'] || 10000}";
              ns:tripleIndexes "${repParam['Triple indexes'] || 'spoc,posc'}";
              sb:evaluationStrategyFactory "${repParam['EvaluationStrategyFactory'] || 'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'}"
            ]
          ]
        ]
      ]
    ].
  `;
  if (repType === 'virtuoso')
    return `
  #
  # Sesame configuration template for a virtuoso repository
  #
  @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
  @prefix rep: <http://www.openrdf.org/config/repository#>.
  @prefix vr: <http://www.openrdf.org/config/repository/virtuoso#>.
    
  [] a rep:Repository ;
    rep:repositoryID "${repParam['Repository ID'] || 'virtuoso'}" ;
    rdfs:label "${repParam['Repository title'] || 'Virtuoso repository'}" ;
    rep:repositoryImpl [
      rep:repositoryType "openrdf:VirtuosoRepository" ;
      vr:hostList "${repParam['Host list'] || 'localhost:1111'}" ;
      vr:username "${repParam['Username'] || 'dba'}" ;
      vr:password "${repParam['Password'] || 'dba'}" ;
      vr:defGraph "${repParam['Default graph name'] || 'sesame:nil'}" ;
      vr:roundRobin ${repParam['Use RoundRobin for connection'] || false} ;
      vr:useLazyAdd ${repParam['Enable using batch optimization'] || false} ;
      vr:batchSize ${repParam['Batch size for Inserts data'] || 5000} ;
      vr:insertBNodeAsVirtuosoIRI ${repParam['Insert BNode as Virtuoso IRI'] || false} ;
      vr:fetchSize ${repParam['Buffer fetch size'] || 100} ;
      vr:ruleSet "${repParam['Inference RuleSet name'] || null}";
      vr:macroLib "${repParam['Inference MacroLib name'] || null}";
      vr:concurrency ${repParam['ConcurrencyMode'] || 0} ;
      vr:useDefGraphForQueries ${repParam["Use defGraph with SPARQL queries, if query default graph wasn't set"] ||
        true}
    ].
  `;
  return '';
}
