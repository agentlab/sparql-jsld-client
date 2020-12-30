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
import moment from 'moment';
import { isArray } from 'lodash';

import { JsObject } from '../ObjectProvider';
import { executeUpdate, FileUploadConfig, Results, sendPostQuery, sendPostStatements, createRepositoryConfig } from '../SparqlClient';

import { Query2 } from './Query';
import { Prefixes } from './Prefixes';
import { Schemas } from './Schemas';
import { Server2 } from './Model';
import { variable } from '@rdfjs/data-model';


export function setPropertyIfExistsAndUnset(schema: any, propKey: string, data: any, value: any) {
  const schemaKey = propKey !== '@_id' ? propKey : '@id';
  if (schema.properties[schemaKey] !== undefined && data[propKey] === undefined)
    data[propKey] = value;
  return  data[propKey];
}

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
    const server = getParentOfType(self, Server2);
    const nsRouter = (schema: any): string => {
      const individualNamespace = schema.defaultIndividNs || 'http://cpgu.kbpm.ru/ns/rm/rdf#';
      return individualNamespace;
    };

    const normalizeQuery = (data: any) => {
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
      query.shapes.forEach((s: any) => {
        if (s.schema && typeof s.schema === 'object') {
          // add all full-specified schemas to schema repository and replace it in shape with reference
          //self.schemas.addSchema(d.schema);
          //d.schema = d.schema['@id'];

          // reset id for private schema to existing schema if it exists in repo
          if (self.schemas.json.has(s.schema['@id'])) {
            // regenerate @id
            //s.schema['@id'] = undefined;
            //addMissingId(s.schema);
            // reset to reference to existing schema
            //s.schema = s.schema['@id'];
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
      return query;
    }

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
        if (response.status < 200 && response.status > 204)
          throw Error('Cannot upload statements');
      }),

      uploadFiles: flow(function* uploadFiles(files: FileUploadConfig[], rootFolder = '') {
        //console.debug('uploadFiles ', files);
        let statements = "";
        for (let index = 0; index < files.length; index++) {
          const f = files[index];
          statements = statements + fs.readFileSync(rootFolder + f.file, 'utf8');
          //console.debug('file=', f.file);
          //console.debug('statements=', statements);
          
        }
        if (statements.length > 0 && files.length > 0) {
          //@ts-ignore
          yield self.uploadStatements(statements, files[0].baseURI);
        }
        /*const promises = yield* files.map((f) => {
          const statements = fs.readFileSync(rootFolder + f.file, 'utf8');
          //console.debug('file=', f.file);
          //console.debug('statements=', statements);
          //@ts-ignore
          return self.uploadStatements(statements, f.baseURI);
        });
        return promises;*/
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
    
      sparqlUpdate: flow(function* sparqlUpdate(query: string, queryParams: JsObject = {}) {
        //console.debug(() => `sparqlUpdate url=${this.repositoryUrl} queryParams=${json2str(queryParams)}`);
        return executeUpdate(self.statementsUrl, query, queryParams);
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

      addQuery: flow(function* addQuery(data: any) {
        const query = normalizeQuery(data);
        for(let i = 0; i < query.shapes.length; i++) {
          const shape: any = query.shapes[i];
          if (typeof shape.schema === 'string') {
            yield self.schemas.getSchemaByIri(shape.schema);
          }
        };
        let qid = query['@id'];
        self.queries.set(qid, query as any);
        const queryObj = self.queries.get(qid);
        if (!queryObj) throw new Error('Cannot create query object in model');
        return queryObj;
      }),

      removeQuery(query: string | any) {
        const id = (typeof query === 'string') ? query : query['@id'];
        if (id) self.queries.delete(id);
      },

      /**
       * Call variants:
       *  selectObjects('rm:ArtifactShape') // with shape IRI
       * 
       * selectObjects(schema object)
       * 
       *  selectObjects({
       *    schema: 'rm:ArtifactShape',
       *    conditions: {...},
       *  })
       * 
       *  selectObjects([
       *    {
       *      schema: 'rm:ArtifactShape',
       *      conditions: {...},
       *    },
       *    {
       *      schema: 'rm:ArtifactShape',
       *      conditions: {...},
       *    }
       *  ])
       */
      selectObjects: flow(function* selectObjects(data: any) {
        //@ts-ignore
        const query = yield self.addQuery(data);
        const objects = yield query.selectObjects();
        //@ts-ignore
        self.removeQuery(query);
        return objects;
      }),

      /**
       * Возвращает полученный с сервера набор JSON объектов определенного типа со значениями полей, соответствующий JSON Schema + JSON-LD
       * ограничениям и дополнительным условиям на значения объектов из conditions.
       * Дополнительно запрашивает конечный тип объекта (самый "нижний" / специфичный в иерархии наследования).
       * Особым образом обрабатывает поля-массивы.
       * 
       * See selectObjects
       */
      selectObjectsWithTypeInfo: flow(function* selectObjectsWithTypeInfo(data: any) {
        //@ts-ignore
        const query = yield self.addQuery(data);
        const objects = yield query.selectObjectsWithTypeInfo();
        //@ts-ignore
        self.removeQuery(query);
        return objects;
      }),

      /**
       * Находит один объект по его идентификатору (численному полю identifier)
       * Accepts shape IRI or schema object
       */
      selectMaxObjectId: flow(function* selectMaxObjectId(schema: any) {
        if (typeof schema === 'string') schema = yield self.schemas.getSchemaByIri(schema);
        //@ts-ignore
        const lastIdObject = yield self.selectObjects({
          shapes: [{
            schema: schema['@id'],
            variables: {
              identifier: schema.properties.identifier
            },
          }],
          orderBy: [{ expression: variable('identifier0'), descending: true }],
          limit: 1,
        });
        return lastIdObject.length === 0 ? 0 : lastIdObject[0].identifier as number;
      }),
      

      /**
       * Удаляет ВСЕ триплы для заданного URI, соответствующего набору значений полей из conditions
       * @param data: {
       *    schema -- JSON схема с RDF классоми и определениями RDF свойств
       *    conditions -- объект с полями для условия поиска
       * }
       */
      deleteObject: flow(function* deleteObject(data: any) {
        //@ts-ignore
        const query = yield self.addQuery(data);
        const response = yield query.deleteObject();
        //@ts-ignore
        self.removeQuery(query);
        return response;
      }),

      /**
       * Создает объект в соответствии с классом из schema и значениями полей из data
       * URI генерируется автоматически
       * Текущий пользователь и текущее время устанавливаются как создатель и автор изменений, время создания и изменения
       * @param data: {
       *    schema -- JSON схема с RDF классоми и определениями RDF свойств
       *    data -- объект с данными для создания и сохранения
       * }
       */
      createObject: flow(function* createObject(data: any) {
        const query = normalizeQuery(data);
        const now = moment().toISOString();
        for (let index = 0; index < query.shapes.length; index++) {
          const s = query.shapes[index];
          if (s.schema && s.data) {
            let schema: any = s.schema;
            if (typeof s.schema === 'string') schema = yield self.schemas.getSchemaByIri(schema);
            if (schema) {
              setPropertyIfExistsAndUnset(schema, '@_id', s.data, self.queryPrefixes.abbreviateIri(self.queryPrefixes.deAbbreviateIri(nsRouter(schema)) + '_' + uuid62.v4()));
              //setPropertyIfExistsAndUnset(schema, 'created', s.data, now);
              //setPropertyIfExistsAndUnset(schema, 'creator', s.data, server.user.login);
              //setPropertyIfExistsAndUnset(schema, 'modified', s.data, now);
              //setPropertyIfExistsAndUnset(schema, 'modifiedBy', s.data, server.user.login);
              //setPropertyIfExistsAndUnset(schema, 'processArea', s.data, server.processArea);

              if (schema.properties.identifier !== undefined && s.data.identifier === undefined) {
                //@ts-ignore
                const id = yield self.selectMaxObjectId('rm:ArtifactShape');
                //console.debug('id', id);
                s.data.identifier = id + 1;
              }
            }
          }
        }
        let qid = query['@id'];
        self.queries.set(qid, query as any);
        const queryObj = self.queries.get(qid);
        if (!queryObj) throw new Error('Cannot create query object in model');

        const response = yield queryObj.createObject();
        //console.debug(response);
        //@ts-ignore
        const objects = yield self.selectObjects({
          schema: query.shapes[0].schema,
          conditions: {
            '@_id': query.shapes[0].data['@_id'],
          }
        });
        //@ts-ignore
        self.removeQuery(queryObj);     
        return objects.length === 1 ? objects[0] : objects;
      }),

      /**
       * Обновляет конкретные поля с конкретными старыми значениями на новые значения. Через добавление и удаление триплов.
       * При обновлении полей объекта, поля со старыми значениями должны быть в объекте conditions, а поля с новыми значениями -- в объекте data.
       * Удаляет все значения полей с такими же URI, но другими значениями (т.е. при кратности > 1).
       * В дальнейшем можно добавить проверку кратности > 1 в схеме и обновление только конкретных значений.
       * @param data: {
       *    schema -- JSON схема с RDF классом и определениями RDF свойств
       *    conditions -- исходный объект со всеми полями и их значениями (старыми) и URI для поиска
       *    data -- только изменяемые поля с новыми значениями в соответствии со схемой
       * }
       */
      updateObject: flow(function* updateObject(data: any) {
        if (data.shapes && isArray(data.shapes)) {
          const now = moment().toISOString();
          data.shapes.forEach((s: any) => {
            if (s.schema && s.data) {
              let schema: any = s.schema;
              if (typeof s.schema === 'string') {
                schema = self.schemas.json.get(schema)?.js;
                if (schema) {
                  setPropertyIfExistsAndUnset(schema, 'modified', s.data, now);
                  setPropertyIfExistsAndUnset(schema, 'modifiedBy', s.data, server.user);
                }
              }
            }
          });
        }
        //@ts-ignore
        const query = yield self.addQuery(data);
        const response = yield query.updateObject();
        //@ts-ignore
        self.removeQuery(query);
        return response;
      }),
    };
  });

function addMissingId(data: any | undefined) {
  if (data && typeof data === 'object' && !data['@id']) data['@id'] = '_' + uuid62.v4();
}
//export interface IRepository extends Instance<typeof Repository> {}
