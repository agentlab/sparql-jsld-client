/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { AxiosHeaders, AxiosResponse } from 'axios';
import { SparqlClient, Results } from '../src/SparqlClient';
import { JsObject, JsStrObj } from '../src/ObjectProvider';

const HttpResponse200: AxiosResponse<any> = {
  data: {},
  status: 200,
  statusText: 'Ok',
  headers: {},
  config: {
    headers: new AxiosHeaders(),
  },
};

/**
 * RDF4J REST API & SPARQL TEST Client
 */
export class SparqlClientImplMock implements SparqlClient {
  serverUrl = '';
  repId = '';
  repositoryUrl = '';
  statementsUrl = '';

  /**
   * Test Mockup state props
   */
  nsReturn: JsStrObj = {};

  uploadStatementsParams = {};

  sparqlSelectParams: { query: string; queryParams: JsObject } = {
    query: '',
    queryParams: {},
  };
  sparqlSelectReturn: Results = { bindings: [] };

  sparqlConstructParams: { query: string; queryParams: JsObject } = {
    query: '',
    queryParams: {},
  };
  sparqlConstructReturn: JsObject[] = [];

  sparqlUpdateParams: { query: string; queryParams: JsObject } = {
    query: '',
    queryParams: {},
  };
  sparqlUpdateReturn = HttpResponse200;

  clearGraphParams = {};
  clearGraphReturn = HttpResponse200;

  deleteRepositoryParams = {};
  createRepositoryAndSetCurrentParams = {};
  createRepositoryParams = {};

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

  async loadNs(): Promise<JsStrObj> {
    return this.nsReturn;
  }

  async uploadStatements(statements: string, baseURI?: string, graph?: string): Promise<void> {
    this.uploadStatementsParams = {
      statements: statements.replace(/^#.*$/gm, ''),
      baseURI,
      graph,
    };
  }

  //async downloadStatements(graph?: string): Promise<string> {
  //console.debug(() => `downloadStatements url=${this.repositoryUrl} graph=${graph}`);
  //return Promise.reject('');
  //}

  async sparqlSelect(query: string, queryParams: JsObject = {}): Promise<Results> {
    this.sparqlSelectParams = {
      query,
      queryParams,
    };
    return this.sparqlSelectReturn;
  }

  async sparqlConstruct(query: string, queryParams: JsObject = {}): Promise<JsObject[]> {
    this.sparqlConstructParams = {
      query,
      queryParams,
    };
    return this.sparqlConstructReturn;
  }

  async sparqlUpdate(query: string, queryParams: JsObject = {}): Promise<AxiosResponse<any>> {
    this.sparqlUpdateParams = {
      query,
      queryParams,
    };
    return this.sparqlUpdateReturn;
  }

  async clearGraph(graph = 'null') {
    this.clearGraphParams = {
      graph,
    };
    return this.clearGraphReturn;
  }

  async deleteRepository(repId: string) {
    this.createRepositoryParams = {
      repId,
    };
  }

  async createRepositoryAndSetCurrent(repParam: JsObject = {}, repType = 'native-rdfs') {
    this.createRepositoryAndSetCurrentParams = {
      repParam,
      repType,
    };
  }

  async createRepository(repParam: JsObject = {}, repType = 'native-rdfs') {
    this.createRepositoryParams = {
      repParam,
      repType,
    };
  }
}
