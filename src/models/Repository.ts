import { types, flow, getParentOfType, Instance, applySnapshot } from 'mobx-state-tree';
import axios from 'axios';
import fs from 'fs';
import uuid62 from 'uuid62';

import { JsObject, JSONSchema6DefinitionForRdfProperty, JSONSchema6forRdf, Query } from '../ObjectProvider';
import { Bindings, FileUploadConfig, Results, sendPostQuery, sendPostStatements } from '../SparqlClient';
import { createRepositoryConfig } from '../SparqlClientImpl';
import { createObjectWithoutRepetitions } from '../ObjectProviderImpl';

import { getSchemaPropType, SparqlGen } from '../SparqlGen';

import { Query2 } from './Query';
import { Prefixes } from './Prefixes';
import { Schemas } from './Schemas';
import { Server2 } from './Model';
import { Optional } from 'utility-types';
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
    const sparqlSelect = flow(function* sparqlSelect(query: string, queryParams: JsObject = {}) {
      //console.debug(() => `sparqlSelect url=${this.repositoryUrl} query=${query} queryParams=${json2str(queryParams)}`);
      const response = yield sendPostQuery('self.repositoryUrl', query, queryParams);
      // console.debug(() => `sparqlSelect response=${json2str(response)}`);
      let results: Results = { bindings: [] };
      if (response.data && response.data.results) {
        results = response.data.results;
      }
      return results;
    });

    const selectObjectsInternal = flow(function* selectObjectsInternal(
      schema: JSONSchema6forRdf,
      //conditions: any,
      queryConstructor: () => string,
      objectConstructor: (bindings: Bindings) => JsObject,
    ) {
      const query = queryConstructor();
      const results = yield sparqlSelect(query);
      //console.debug(() => `selectObjectsInternal results=${json2str(results)}`);
      // Map bindings
      let objects = results.bindings.map(objectConstructor);
      //console.debug(() => `selectObjectsInternal objects=${json2str(objects)}`);
      //objects.forEach((artifact) => this.convertToInternal(schema, artifact));
      //console.debug(() => `selectObjectsInternal objectsInternal=${json2str(objects)}`);
      //make arrays from objects with the same uri
      objects = createObjectWithoutRepetitions(objects, schema);
      //console.debug(() => `selectObjectsInternal objects_with_arrays=${json2str(objects)}`);
      return objects;
    });

    /**
     * Заменяет
     * @param obj
     */
    const selectObjectsArrayProperties = flow(function* selectObjectsArrayProperties(
      schemaOrString: JSONSchema6forRdf | string,
      schemaPropsWithArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty },
      objects: JsObject[],
    ) {
      if (Object.keys(schemaPropsWithArrays).length > 0) {
        const schema: JSONSchema6forRdf =
          typeof schemaOrString === 'string' ? yield self.schemas.getSchemaByUri(schemaOrString) : schemaOrString;
        const anyContext = schema['@context'];
        const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
        for (const object of objects) {
          for (const key of Object.keys(schemaPropsWithArrays)) {
            const schemaWithArrayProperty: JSONSchema6forRdf = {
              ...schema,
            };
            schemaWithArrayProperty.properties = {};
            const prop = schemaPropsWithArrays[key];
            schemaWithArrayProperty.properties[key] = prop;
            schemaWithArrayProperty.required = ['@id', key];
            const propType = getSchemaPropType(schemaWithArrayProperty.properties, context, key);

            if (prop && prop.type && propType) {
              let schemaUri: string | undefined = undefined;
              if (prop.type === 'array' && prop.items) {
                schemaUri = propType;
              } else if (prop.type === 'object') {
                schemaUri = propType;
              } else if (prop.type === 'string' && prop.format === 'iri') {
                schemaUri = propType;
              }
              if (schemaUri) {
                const schema2 = yield self.schemas.getSchemaByUri(schemaUri);
                let queryPrefixes = self.queryPrefixes.current;
                const sparqlGen = new SparqlGen(self.queryPrefixes.currentJs);
                sparqlGen
                  .addSparqlShape(schemaWithArrayProperty, { '@id': object['@id'], property: '?eIri1' })
                  .addSparqlShape(schema2);

                const query = sparqlGen.selectObjectsQuery().stringify();
                //console.debug(() => `selectObjectsArrayProperties query=${query}`);
                const selectResults: Results = yield sparqlSelect(query);
                //console.debug(() => `selectObjectsArrayProperties results=${json2str(selectResults)}`);

                const objects = selectResults.bindings.map((bindings) => {
                  if (schemaUri) return sparqlGen.sparqlBindingsToObjectBySchemaIri(bindings, schemaUri);
                  else return {};
                });
                //console.debug(() => `selectObjectsInternal objects=${json2str(objects)}`);
                //objects.forEach((artifact) => this.convertToInternal(schema2, artifact));
                //console.debug(() => `selectObjectsInternal objectsInternal=${json2str(objects)}`);
                //make arrays from objects with the same uri
                //objects = createObjectWithoutRepetitions(objects, schema);
                object[key] = objects;
              }
            }
          }
        }
      }
      return objects;
    });

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

      selectObjects: flow(function* selectObjects(schemaOrString: JSONSchema6forRdf | string, conditions: any = {}) {
        const schema: JSONSchema6forRdf =
          typeof schemaOrString === 'string' ? yield self.schemas.getSchemaByUri(schemaOrString) : schemaOrString;
        const schemaPropsWithoutArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
        const schemaPropsWithArrays: { [key: string]: JSONSchema6DefinitionForRdfProperty } = {};
        const conditionsWithoutArrays: any = {};
        const conditionsWithArrays: any = {};
        if (schema.properties) {
          Object.keys(schema.properties).forEach((key) => {
            if (schema.properties) {
              if (schema.properties[key].type === 'array') {
                schemaPropsWithArrays[key] = schema.properties[key];
                if (conditions[key] !== undefined) conditionsWithArrays[key] = conditions[key];
              } else {
                schemaPropsWithoutArrays[key] = schema.properties[key];
                if (conditions[key] !== undefined) conditionsWithoutArrays[key] = conditions[key];
              }
            }
          });
        }
        //console.debug(() => `selectObjects conditionsWithArrays=${json2str(conditionsWithArrays)}`);
        //console.debug(() => `selectObjects schemaPropsWithArrays=${json2str(schemaPropsWithArrays)}`);
        //console.debug(() => `selectObjects conditionsWithoutArrays=${json2str(conditionsWithoutArrays)}`);
        //console.debug(() => `selectObjects schemaPropsWithoutArrays=${json2str(schemaPropsWithoutArrays)}`);
        const schemaWithoutArrays = {
          ...schema,
          properties: schemaPropsWithoutArrays,
        };
        const sparqlGen = new SparqlGen(self.queryPrefixes.currentJs);
        const objects: JsObject[] = yield selectObjectsInternal(
          schemaWithoutArrays,
          () => {
            sparqlGen.addSparqlShape(schemaWithoutArrays, conditionsWithoutArrays);
            //sparqlGen.shapes[0].variables['@type'] = schemaWithoutArrays['@type'];
            //addprops2vars2props(sparqlGen.shapes[0], '@type', 'type0');
            sparqlGen.selectObjectsQuery();
            //console.debug(() => `selectObjects query=${json2str(sparqlGen.query)}`);
            return sparqlGen.stringify();
          },
          (bindings) => sparqlGen.sparqlBindingsToObjectProp(bindings),
        );
        //process array properties
        yield selectObjectsArrayProperties(schema, schemaPropsWithArrays, objects);
        //console.debug(() => `selectObjects objects_with_arrays=${json2str(objects)}`);
        return objects;
      }),
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
        const promises = files.map((f) => {
          const statements = fs.readFileSync(rootFolder + f.file, 'utf8');
          //console.log('file=', f.file);
          //console.log('statements=', statements);

          //@ts-ignore
          return self.uploadStatements(statements, f.baseURI);
        });
        return Promise.all(promises);
      }),

      selectObjectsByQuery: flow(function* selectObjectsByQuery(query: Query) {
        console.log(query);
        //@ts-ignore
        /*const sparqlGen = new SparqlGen(self.queryPrefixes);
        // copy query object, filter and rename screened @id and @type in conditions
        query = {
          ...query,
          shapes: query.shapes.map(
            (shape: QueryShape): QueryShape => {
              let filteredShape: any;
              if (shape.conditions) {
                const filteredConditions: any = {};
                copyUniqueObjectPropsWithRenameOrFilter(filteredConditions, shape.conditions, {
                  '@id': null,
                  '@type': null,
                  '@_id': '@id',
                  '@_type': '@type',
                });
                filteredShape = {
                  ...shape,
                  conditions: filteredConditions,
                };
              } else {
                filteredShape = { ...shape };
              }
              return filteredShape;
            },
          ),
        };
        yield Promise.all(
          query.shapes.map(async (s: QueryShape) => {
            if (s.schema) {
              if (typeof s.schema === 'string') {
                //@ts-ignore
                s.schema = await self.getSchemaByUri(s.schema);
                //console.debug('selectObjectsByQuery s.schema=', json2str(s.schema));
              }
            }
          }),
        );
        query.shapes.forEach((s: QueryShape) => {
          if (typeof s.schema !== 'string') sparqlGen.addSparqlShape(s.schema, s.conditions);
        });
        sparqlGen.selectObjectsQuery();
        if (query.limit) sparqlGen.limit(query.limit);
        if (query.offset) sparqlGen.limit(query.offset);
        if (query.orderBy) {
          const orderBy = [];
          if (typeof query.orderBy === 'string') {
            orderBy.push(makeOrderBy(query.orderBy));
          } else if (Array.isArray(query.orderBy) === true) {
            query.orderBy.forEach((e) => orderBy.push(makeOrderBy(e)));
          }
          sparqlGen.orderBy(orderBy);
        }
        const queryStr = sparqlGen.stringify();
        //console.debug('selectObjectsByQuery query=', queryStr);
        const selectResults = yield self.client.sparqlSelect(queryStr);
        //console.debug('selectObjectsByQuery results=', json2str(selectResults));
        // if no variables
        const objects = selectResults.bindings.map((bindings) => {
          return sparqlGen.sparqlBindingsToObjectProp(bindings);
        });
        return objects;*/
        return Array(10);
      }),

      addQuery(
        data: any /*Optional<IQueryShape2, '@id'> | Optional<IQueryShape2, '@id'>[] | Optional<IQuery2, '@id'>*/,
      ) {
        let query: any; // IQuery2
        if (!data.shapes) {
          if (isArray(data)) {
            query = { shapes: [...data] }; // as IQueryShape2[]
            query.shapes.forEach((s: any) => {
              if (!s['@id']) s['@id'] = '_' + uuid62.v4();
            });
          } else {
            query = { shapes: [data as any] }; // as IQueryShape2
            if (!data['@id']) query.shapes[0]['@id'] = '_' + uuid62.v4();
          }
        } else {
          query = data as any; // as IQuery2
        }
        let qid = query['@id'];
        if (!qid) {
          qid = '_' + uuid62.v4();
          query['@id'] = qid;
        }
        self.queries.set(qid, query as any);

        const queryObj = self.queries.get(qid);
        if (!queryObj) throw new Error('Cannot create query object in model');
        return queryObj;
      },
    };
  });

//export interface IRepository extends Instance<typeof Repository> {}
