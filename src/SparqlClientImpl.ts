import fs from 'fs';
import {
  SparqlClient,
  sendGet,
  sendPostQuery,
  sendPostStatements,
  executeUpdate,
  FileUploadConfig,
  Results,
} from './SparqlClient';
import { JsObject } from './ObjectProvider';
import axios, { AxiosResponse } from 'axios';

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

/**
 * RDF4J REST API & SPARQL Client
 */
export class SparqlClientImpl implements SparqlClient {
  serverUrl = '';
  repId = '';
  repositoryUrl = '';
  statementsUrl = '';

  setServerUrl(url: string): void {
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
  createStatementsUrl(repId: string): string {
    return `${this.serverUrl}/repositories/${repId}/statements`;
  }

  regenerateUrls(): void {
    this.repositoryUrl = this.createRepositoryUrl(this.repId);
    this.statementsUrl = this.createStatementsUrl(this.repId);
  }

  async getNamespaces(): Promise<{ [s: string]: string }> {
    let url = this.repositoryUrl + '/namespaces';
    let response = await sendGet(url);
    if (response.status < 200 && response.status > 204) return Promise.reject('Cannot get namespaces');
    let queryPrefixes: { [s: string]: string } = {};
    //console.debug('response.data', response.data);
    if (response.data && response.data.results) {
      let results: Results = { bindings: [] };
      results = response.data.results;
      if (results) {
        results.bindings.forEach((b) => {
          if (b.prefix && b.namespace && b.prefix.value && b.namespace.value) {
            queryPrefixes[b.prefix.value] = b.namespace.value;
          }
        });
      }
    }
    return queryPrefixes;
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

  async uploadFiles(files: FileUploadConfig[], rootFolder = ''): Promise<void[]> {
    //console.debug('uploadFiles ', files);
    const promises = files.map((f) => {
      const statements = fs.readFileSync(rootFolder + f.file, 'utf8');
      //console.debug('file=', f.file);
      //console.debug('statements=', statements);
      return this.uploadStatements(statements, f.baseURI, f.graph);
    });
    return Promise.all(promises);
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

  async sparqlUpdate(query: string, queryParams: JsObject = {}): Promise<AxiosResponse> {
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

  async createRepositoryAndSetCurrent(repParam: JsObject = {}, repType: string = 'native-rdfs'): Promise<void> {
    await this.createRepository(repParam, repType);
    this.setRepositoryId(repParam['Repository ID']);
  }

  async createRepository(repParam: JsObject = {}, repType: string = 'native-rdfs'): Promise<void> {
    if (repType === 'virtuoso') {
      let repId = repParam['Repository ID'];
      repParam = {
        ...repParam,
        'Default graph name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
        'Inference RuleSet name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
        "Use defGraph with SPARQL queries, if query default graph wasn't set": true,
      };
    }
    const url = this.createRepositoryUrl(repParam['Repository ID']);
    const data = createRepositoryConfig(repParam, repType);
    const response = await axios.request({
      method: 'put',
      url,
      headers: {
        'Content-Type': 'text/turtle',
      },
      data,
    });
    if (response.status < 200 && response.status > 204) throw Error(`createRepository fault, url=${url}`);
    //console.debug(() => `createRepository url=${url}`);
  }
}
