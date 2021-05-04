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
import { JsObject, json2str, JsStrObj } from './ObjectProvider';

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

export interface SparqlClient {
  setServerUrl(url: string): void;
  setRepositoryId(repId: string): void;

  loadNs(): Promise<JsStrObj>;

  uploadStatements(statements: string, baseURI?: string, graph?: string): Promise<void>;
  //downloadStatements(graph?: string): Promise<string>;

  sparqlSelect(query: string, queryParams?: JsObject): Promise<Results>;
  sparqlConstruct(query: string, queryParams?: JsObject): Promise<JsObject[]>;
  sparqlUpdate(query: string, queryParams?: JsObject): Promise<AxiosResponse>;

  clearGraph(graph?: string): Promise<any>;

  createRepositoryAndSetCurrent(repParam: JsObject): Promise<void>;
  createRepositoryAndSetCurrent(repParam: JsObject, repType: string): Promise<void>;

  createRepository(repParam: JsObject): Promise<void>;
  createRepository(repParam: JsObject, repType: string): Promise<void>;
  deleteRepository(repId: string): Promise<void>;
}
