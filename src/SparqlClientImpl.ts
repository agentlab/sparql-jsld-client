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

function createRepositoryConfig(repId: string): string {
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
    rep:repositoryID "${repId}" ;
    rdfs:label "Native store with RDF Schema inferencing" ;
    rep:repositoryImpl [
      rep:repositoryType "openrdf:SailRepository" ;
      sr:sailImpl [
        sail:sailType "rdf4j:SchemaCachingRDFSInferencer" ;
        sail:delegate [
          sail:sailType "openrdf:DedupingInferencer" ;
          sail:delegate [
            sail:sailType "openrdf:NativeStore" ;
            sail:iterationCacheSyncThreshold "10000";
            ns:tripleIndexes "spoc,posc";
            sb:evaluationStrategyFactory "org.eclipse.rdf4j.query.algebra.evaluation.impl.StrictEvaluationStrategyFactory"
          ]
        ]
      ]
    ].
  `;
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
    //console.log('response.data', response.data);
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

  async uploadStatements(statements: string, baseURI?: string /*, graph?: string*/): Promise<void> {
    //console.debug(() => `uploadStatements url=${this.statementsUrl} graph=${graph}`);
    statements = statements.replace(/^#.*$/gm, '');
    //console.debug(() => `uploadStatements statements=${statements}`);
    const response = await sendPostStatements(this.statementsUrl, statements, { baseURI });
    if (response.status < 200 && response.status > 204) return Promise.reject('Cannot upload statements');
  }

  async uploadFiles(files: FileUploadConfig[], rootFolder = ''): Promise<void[]> {
    //console.log('uploadFiles ', files);
    const promises = files.map((f) => {
      const statements = fs.readFileSync(rootFolder + f.file, 'utf8');
      //console.log('file=', f.file);
      //console.log('statements=', statements);
      return this.uploadStatements(statements, f.baseURI);
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
    const query = `CLEAR GRAPH <${graph}> `;
    //console.debug(() => `clearGraph url=${this.repositoryUrl} query=${query}`);
    return sendPostQuery(this.repositoryUrl, query);
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

  async createRepositoryAndSetCurrent(repId: string): Promise<void> {
    await this.createRepository(repId);
    this.setRepositoryId(repId);
  }

  async createRepository(repId: string): Promise<void> {
    const url = this.createRepositoryUrl(repId);
    const response = await axios.request({
      method: 'put',
      url,
      headers: {
        'Content-Type': 'text/turtle',
      },
      data: createRepositoryConfig(repId),
    });
    if (response.status < 200 && response.status > 204) throw Error(`createRepository fault, url=${url}`);
    //console.debug(() => `createRepository url=${url}`);
  }
}
