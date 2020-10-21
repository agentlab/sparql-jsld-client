import { types, flow, getParentOfType } from 'mobx-state-tree';
import axios from 'axios';
import fs from 'fs';
import uuid62 from 'uuid62';

import { JsObject } from '../ObjectProvider';
import { executeUpdate, FileUploadConfig, Results, sendPostQuery, sendPostStatements } from '../SparqlClient';
import { createRepositoryConfig } from '../SparqlClientImpl';

import { Query2 } from './Query';
import { Prefixes } from './Prefixes';
import { Schemas } from './Schemas';
import { Server2 } from './Model';
import { isArray } from 'lodash';

export const Repository = types
  .model('Repository', {
    repId: types.string,
    queryPrefixes: Prefixes,
    schemas: Schemas,
    queries: types.map(Query2),
  })

  /**
   * Views
   */
  .views((self) => {
    return {
      createRepositoryUrl(repId: string): string {
        const server = getParentOfType(self, Server2) as any;
        return `${server.url}/repositories/${repId}`;
      },

      createStatementsUrl(repId: string): string {
        const server = getParentOfType(self, Server2) as any;
        return `${server.url}/repositories/${repId}/statements`;
      },

      get repositoryUrl() {
        return this.createRepositoryUrl(self.repId);
      },

      get statementsUrl() {
        return this.createStatementsUrl(self.repId);
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {

    return {
      afterAttach() {
        //const t = self.selectObjects('asd');
      },

      setId(repId: string) {
        self.repId = repId;
      },

      /**
       * Repo operations
       */

      createRepository: flow(function* createRepository(repParam: JsObject = {}, repType: string = 'native-rdfs') {
        if (repType === 'virtuoso') {
          let repId = repParam['Repository ID'];
          repParam = {
            ...repParam,
            'Default graph name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
            'Inference RuleSet name': `http://cpgu.kbpm.ru/ns/rm/${repId}`,
            "Use defGraph with SPARQL queries, if query default graph wasn't set": true,
          };
        }
        const url = self.createRepositoryUrl(repParam['Repository ID']);
        const response = yield axios.request({
          method: 'put',
          url,
          headers: {
            'Content-Type': 'text/turtle',
          },
          data: createRepositoryConfig(repParam, repType),
        });
        if (response.status < 200 && response.status > 204) throw Error(`createRepository fault, url=${url}`);
        //console.debug(() => `createRepository url=${url}`);
      }),

      deleteRepository: flow(function* deleteRepository(repId: string) {
        const url = self.createRepositoryUrl(repId);
        const response = yield axios.request({
          method: 'delete',
          url,
          headers: {
            'Content-Type': 'text/turtle',
          },
          data: '',
        });
        if (response.status < 200 && response.status > 204) throw Error(`deleteRepository fault, url=${url}`);
        //console.debug(() => `deleteRepository url=${url}`);
      }),

      /**
       * Repo data opeations
       */

      uploadStatements: flow(function* uploadStatements(statements: string, baseURI?: string /*, graph?: string*/) {
        //console.debug(() => `uploadStatements url=${self.statementsUrl}`);
        statements = statements.replace(/^#.*$/gm, '');
        //console.debug(() => `uploadStatements statements=${statements}`);

        const response = yield sendPostStatements(self.statementsUrl, statements, { baseURI });
        if (response.status < 200 && response.status > 204) return Promise.reject('Cannot upload statements');
        return;
      }),

      uploadFiles: flow(function* uploadFiles(files: FileUploadConfig[], rootFolder = '') {
        //console.log('uploadFiles ', files);
        const promises = yield* files.map((f) => {
          const statements = fs.readFileSync(rootFolder + f.file, 'utf8');
          //console.log('file=', f.file);
          //console.log('statements=', statements);
          //@ts-ignore
          return self.uploadStatements(statements, f.baseURI);
        });
        return promises;
      }),

      sparqlSelect: flow(function* sparqlSelect(query: string, queryParams: JsObject = {}) {
        //console.debug(() => `sparqlSelect url=${this.repositoryUrl} query=${query} queryParams=${json2str(queryParams)}`);
        const response = yield sendPostQuery(self.repositoryUrl, query, queryParams);
        // console.debug(() => `sparqlSelect response=${json2str(response)}`);
        let results: Results = { bindings: [] };
        if (response.data && response.data.results) {
          results = response.data.results;
            }
        return results;
      }),
          }),
    
      /**
       * Удаляет все триплы в графе с заданным graph
       * @param graph
       */
      clearGraph: flow(function* clearGraph(graph = 'null') {
        const query = `CLEAR GRAPH <${graph}>`;
        //console.debug(() => `clearGraph url=${this.repositoryUrl} query=${query}`);
        //return sendPostQuery(this.repositoryUrl, query);
        return yield executeUpdate(self.statementsUrl, query);
      }),

      addQuery(
        data: any /*Optional<IQueryShape2, '@id'> | Optional<IQueryShape2, '@id'>[] | Optional<IQuery2, '@id'>*/,
      ) {
        let query: any; // IQuery2
        if (!data.shapes) {
          if (typeof data === 'string') {
            query = {
              shapes: [{
                schema: data,
              }]
            };
          }
          else if (isArray(data)) {
            query = { shapes: [...data] }; // as IQueryShape2[]
          } else {
            if (data.$schema === undefined) {
            query = { shapes: [data as any] }; // as IQueryShape2
            } else {
              query = {
                shapes: [{
                  schema: data,
                }]
              };
            }
          }
        } else {
          query = data as any; // as IQuery2
        }

        query.shapes.forEach((d: any) => {
          if (d.schema && typeof d.schema === 'object') {
            // add all full-specified schemas to schema repository and replace it in shape with reference
            //self.schemas.addSchema(d.schema);
            //d.schema = d.schema['@id'];

            // reset id (regenerate random) for private schema if it exists in repo
            if (self.schemas.json.has(d.schema['@id'])) {
              d.schema['@id'] = undefined;
              addMissingId(d.schema);
            }
          }
        });

        addMissingId(query);
        query.shapes.forEach((shape: any) => {
          addMissingId(shape);
          addMissingId(shape.conditions);
          addMissingId(shape.variables);
          addMissingId(shape.data);
        });

        let qid = query['@id'];
        self.queries.set(qid, query as any);

        const queryObj = self.queries.get(qid);
        if (!queryObj) throw new Error('Cannot create query object in model');
        return queryObj;
      },

      removeQuery(query: string | any) {
        const id = (typeof query === 'string') ? query : query['@id'];
        if (id) self.queries.delete(id);
      },

      selectObjects: flow(function* selectObjects(data: any) {
        //@ts-ignore
        const query = self.addQuery(data);
        const objects = yield query.selectObjects();
        //@ts-ignore
        self.removeQuery(query);
        return objects;
      }),

    };
  });

function addMissingId(data: any | undefined) {
  if (data && typeof data === 'object' && !data['@id']) data['@id'] = '_' + uuid62.v4();
}
//export interface IRepository extends Instance<typeof Repository> {}
