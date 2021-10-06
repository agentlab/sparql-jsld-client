/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import axios, { AxiosError, AxiosResponse } from 'axios';
import { SparqlClient, sendGet, sendPostQuery, sendPostStatements, executeUpdate, Results } from './SparqlClient';
import { JsObject, json2str, JsStrObj } from './ObjectProvider';

export function createRepositoryConfig(repParam: JsObject = {}, repType = 'native-rdfs'): string {
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
            sb:evaluationStrategyFactory "${
              repParam['EvaluationStrategyFactory'] ||
              'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'
            }"
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
            sb:evaluationStrategyFactory "${
              repParam['EvaluationStrategyFactory'] ||
              'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'
            }"
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
              sb:evaluationStrategyFactory "${
                repParam['EvaluationStrategyFactory'] ||
                'org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory'
              }"
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
      vr:useDefGraphForQueries ${
        repParam["Use defGraph with SPARQL queries, if query default graph wasn't set"] || true
      }
    ].
  `;
  return '';
}

/**
 * RDF4J REST API & SPARQL Client
 */
export class SparqlClientImpl implements SparqlClient {
  serverUrl = '';
  repId = '';
  repositoryUrl = '';
  statementsUrl = '';
  nsUrl = '';

  constructor(url: string, nsUrl?: string) {
    this.setServerUrl(url, nsUrl);
  }

  setServerUrl(url: string, nsUrl?: string): void {
    this.nsUrl = nsUrl || '';
    this.serverUrl = url;
    this.regenerateUrls();
  }

  setRepositoryId(repId: string): void {
    this.repId = repId;
    this.regenerateUrls();
  }

  createRepositoryUrl(repId: string): string {
    return `${this.serverUrl}/repositories/${repId}`;
  }
  createNsUrl(repId: string): string {
    return `${this.serverUrl}/repositories/${repId}/namespaces`;
  }
  createStatementsUrl(repId: string): string {
    return `${this.serverUrl}/repositories/${repId}/statements`;
  }

  regenerateUrls(): void {
    if (this.nsUrl === '' && this.repId !== '') this.nsUrl = this.createNsUrl(this.repId);
    this.repositoryUrl = this.createRepositoryUrl(this.repId);
    this.statementsUrl = this.createStatementsUrl(this.repId);
  }

  async loadNs(): Promise<JsStrObj> {
    const response = await sendGet(this.nsUrl);
    if (response.status < 200 && response.status > 204) return Promise.reject('Cannot get namespaces');
    const ns: JsStrObj = {};
    //console.debug('response.data', response.data);
    if (response.data && response.data.results) {
      let results: Results = { bindings: [] };
      results = response.data.results;
      if (results) {
        results.bindings.forEach((b) => {
          if (b.prefix && b.namespace && b.prefix.value && b.namespace.value) {
            ns[b.prefix.value] = b.namespace.value;
          }
        });
      }
    }
    ns['sesame'] = 'http://www.openrdf.org/schema/sesame#';
    return ns;
  }

  async uploadStatements(statements: string, baseURI?: string, graph?: string): Promise<void> {
    //console.debug(() => `uploadStatements url=${this.statementsUrl} graph=${graph}`);
    statements = statements.replace(/^#.*$/gm, '');
    //console.debug(() => `uploadStatements statements=${statements}`);
    const params: JsObject = { baseURI };
    if (graph) params['context'] = graph;
    const response = await sendPostStatements(this.statementsUrl, statements, params);
    if (response.status < 200 && response.status > 204) return Promise.reject('Cannot upload statements');
  }

  //async downloadStatements(graph?: string): Promise<string> {
  //console.debug(() => `downloadStatements url=${this.repositoryUrl} graph=${graph}`);
  //return Promise.reject('');
  //}

  async sparqlSelect(query: string, queryParams: JsObject = {}): Promise<Results> {
    //console.debug(() => `sparqlSelect url=${this.repositoryUrl} query=${query} queryParams=${json2str(queryParams)}`);
    const response = await sendPostQuery(this.repositoryUrl, query, queryParams);
    // console.debug(() => `sparqlSelect response=${json2str(response)}`);
    let results: Results = { bindings: [] };
    if (response.data && response.data.results) {
      results = response.data.results;
    }
    return results;
  }

  async sparqlConstruct(
    query: string,
    queryParams: JsObject = {},
    accept = 'application/ld+json',
  ): Promise<JsObject[]> {
    //console.debug(() => `sparqlSelect url=${this.repositoryUrl} query=${query} queryParams=${json2str(queryParams)}`);
    //const response = await sendPostQuery(this.repositoryUrl, query, queryParams);
    // console.debug(() => `sparqlSelect response=${json2str(response)}`);
    let queryParamsInUrl = '';
    if (Object.keys(queryParams).length > 0) {
      queryParamsInUrl = `?${Object.keys(queryParams)
        .map((param) => `${param}=${queryParams[param]}`)
        .join('&')}`;
    }
    const url = this.repositoryUrl + queryParamsInUrl;
    try {
      const response = await axios.request<string, AxiosResponse<JsObject[]>>({
        method: 'post',
        url,
        //TODO: Not working 'application/ld+json; profile=\"http://www.w3.org/ns/json-ld#compacted\"'
        headers: {
          'Content-Type': 'application/sparql-query;charset=UTF-8',
          //Accept: 'application/ld+json; profile=\"http://www.w3.org/ns/json-ld#compacted\"',
          Accept: accept, //'application/ld+json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        data: query,
        //transformResponse: (r) => r.data
      });
      return response.data;
    } catch (error: AxiosError<JsObject[]> | any) {
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

  async sparqlUpdate(query: string, queryParams: JsObject = {}): Promise<AxiosResponse<any>> {
    //console.debug(() => `sparqlUpdate url=${this.repositoryUrl} queryParams=${json2str(queryParams)}`);
    return executeUpdate(this.statementsUrl, query, queryParams);
  }

  /**
   * Удаляет все триплы в графе с заданным graph
   * @param graph
   */
  async clearGraph(graph = 'null'): Promise<any> {
    const query = `CLEAR GRAPH <${graph}>`;
    //console.debug(() => `clearGraph url=${this.repositoryUrl} query=${query}`);
    //return sendPostQuery(this.repositoryUrl, query);
    return executeUpdate(this.statementsUrl, query);
  }

  async deleteRepository(repId: string): Promise<void> {
    const url = this.createRepositoryUrl(repId);
    const response = await axios.request({
      method: 'delete',
      url,
      headers: {
        'Content-Type': 'text/turtle',
      },
      data: '',
    });
    if (response.status < 200 && response.status > 204) throw Error(`deleteRepository fault, url=${url}`);
    //console.debug(() => `deleteRepository url=${url}`);
  }

  async createRepositoryAndSetCurrent(repParam: JsObject = {}, repType = 'native-rdfs'): Promise<void> {
    await this.createRepository(repParam, repType);
    this.setRepositoryId(repParam['Repository ID']);
  }

  async createRepository(repParam: JsObject = {}, repType = 'native-rdfs'): Promise<void> {
    const repId = repParam['Repository ID'];
    if (repType === 'virtuoso') {
      repParam = {
        ...repParam,
        'Default graph name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
        'Inference RuleSet name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
        "Use defGraph with SPARQL queries, if query default graph wasn't set": true,
      };
    }
    const url = this.createRepositoryUrl(repId);
    const data = createRepositoryConfig(repParam, repType);
    const response = await axios.request({
      method: 'put',
      url,
      headers: {
        'Content-Type': 'text/turtle',
      },
      data,
    });
    if (response.status < 200 && response.status > 204) {
      console.log('createRepository error', { repId, url, data, response });
      throw Error(`createRepository fault: repId=${repId}, url=${url}`);
    }
    //console.log(`createRepository success: repId=${repId}, url=${url}`);
  }
}
