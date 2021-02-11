/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { types, flow, getSnapshot, getEnv, Instance } from 'mobx-state-tree';
import uuid62 from 'uuid62';
import moment from 'moment';
import { isArray } from 'lodash';
import { variable } from '@rdfjs/data-model';

import { SparqlClient } from '../SparqlClient';

import { Coll } from './Coll';
import { CollConstr, constructObjects, selectObjects } from './CollConstr';
import { Namespaces } from './Namespaces';
import { Schemas } from './Schemas';
import { abbreviateIri, deAbbreviateIri } from '../SparqlGen';

export const User = types
.model('User', {
  login: types.identifier,
  name: types.string,
});

export function setPropertyIfExistsAndUnset(schema: any, propKey: string, data: any, value: any) {
  const schemaKey = propKey !== '@_id' ? propKey : '@id';
  if (schema.properties[schemaKey] !== undefined && data[propKey] === undefined)
    data[propKey] = value;
  return  data[propKey];
}

export const Repository = types
  .model('Repository', {
    repId: types.string,
    user: User,
    //processArea: types.string,
    ns: Namespaces,
    schemas: Schemas,
    collsConstr: types.map(CollConstr),
    colls: types.map(Coll),
  })

  /**
   * Views
   */
  .views((self) => {
    return {
      /**
       * Returns collection object
       * If loadIfNeeded = true AND data is absent it loads collection lazily and asyncronously
       * TODO: If loadIfNeeded = true AND data is old it reloads collection lazily and asyncronously
       * @param iriOrCollConstr 
       */
      getColl(iriOrCollConstr: string | any, loadIfNeeded = true) {
        const iri = (typeof iriOrCollConstr === 'string') ? iriOrCollConstr : iriOrCollConstr['@id'];
        const coll = self.colls.get(iri);

        if (loadIfNeeded && coll && !coll.lastSynced) {
          // TODO: this is ugly, but workaround the idea that views should be side effect free.
          // We need a more elegant solution.
          //@ts-ignore
          setImmediate(() => self.loadColl(iriOrCollConstr));
        }
        return coll;
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {
    const client: SparqlClient = getEnv(self).client;
    client.setRepositoryId(self.repId);

    const nsRouter = (schema: any): string => {
      const individualNamespace = schema.defaultIndividNs || 'http://cpgu.kbpm.ru/ns/rm/rdf#';
      return individualNamespace;
    };

    const normalizeCollConstr = (data: any) => {
      let collConstr: any; // ICollConstr
      if (!data.entConstrs) {
        if (typeof data === 'string') {
          collConstr = {
            entConstrs: [{
              schema: abbreviateIri(data, self.ns.currentJs),
            }]
          };
        }
        else if (isArray(data)) {
          collConstr = { entConstrs: [...data] }; // data as IEntityConstr[]
        } else {
          if (data.$schema === undefined) {
            collConstr = { entConstrs: [data as any] }; // data as IEntityConstr
          } else {
            collConstr = {
              entConstrs: [{
                schema: data,
              }]
            };
          }
        }
      } else {
        collConstr = data as any; // as ICollConstr
      }
      /*addCollConstr.entConstrs.forEach((s: any) => {
        if (s.schema && typeof s.schema === 'object') {
          // add all full-specified schemas to schema repository and replace it in entConstrs with reference
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
      });*/
      addMissingId(collConstr);
      collConstr.entConstrs.forEach((entConstr: any) => {
        addMissingId(entConstr);
        addMissingId(entConstr.conditions);
        addMissingId(entConstr.variables);
        addMissingId(entConstr.data);
      });
      return collConstr;
    }

    return {
      /*afterAttach() {
        //const t = self.selectObjects('asd');
      },*/

      setId(repId: string) {
        self.repId = repId;
        client.setRepositoryId(self.repId);
      },

      /**
       * Call variants:
       *  addCollConstr('rm:ArtifactShape') // with shape IRI
       * 
       * addCollConstr(schema object)
       * 
       *  addCollConstr({
       *    schema: 'rm:ArtifactShape',
       *    conditions: {...},
       *  })
       * 
       *  addCollConstr([
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
      addCollConstr(data: any) {
        const query = normalizeCollConstr(data);
        /*for(let i = 0; i < query.entConstrs.length; i++) {
          const constr: any = query.entConstrs[i];
          if (typeof constr.schema === 'string') {
            yield self.schemas.getSchemaByIri(constr.schema);
          }
        };*/
        let qid = query['@id'];
        const schemas = getSnapshot(self.schemas);
        self.collsConstr.set(qid, query as any);
        const collConstr = self.collsConstr.get(qid);
        if (!collConstr) throw new Error('Cannot create query object in model');
        const c = getSnapshot(collConstr);

        self.colls.put({
          '@id': qid,
          data: [],
          //schema: {},
          //selectQuery: '',
        });
        /*reaction(
          () => self.collsConstr.get(qid),
          collConstr => {
            if (collConstr) {
                console.log("collConstr != null")
            } else {
                console.log("collConstr === null")
            }
          }
        );*/

        return collConstr;
      },

      removeCollConstr(query: string | any) {
        const id = (typeof query === 'string') ? query : query['@id'];
        if (id) {
          self.collsConstr.delete(id);
          self.colls.delete(id);
        }
      },

      loadColl: flow(function* loadColl(iriOrCollConstr: string | any) {
        const collConstr = (typeof iriOrCollConstr === 'string') ? self.collsConstr.get(iriOrCollConstr) : iriOrCollConstr;
        const iri = (typeof iriOrCollConstr === 'string') ? iriOrCollConstr : iriOrCollConstr['@id'];
        let coll = self.colls.get(iri);
        if (!coll) {
          const cc = self.colls.put({
            '@id': iri,
          });
          coll = self.colls.get(iri);
        }
        if (coll)
          yield coll.loadColl(collConstr);
        return coll;
      }),

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
      /*selectObjects: flow(function* selectObjects(data: any) {
        //@ts-ignore
        const collConstr = self.addCollConstr(data);
        const objects = yield collConstr.selectObjects();
        //@ts-ignore
        self.removeCollConstr(collConstr);
        return objects;
      }),*/

      /**
       * Находит один объект по его идентификатору (численному полю identifier)
       * Accepts shape (schema) IRI or schema object
       */
      /*selectMaxObjectId: flow(function* selectMaxObjectId(schema: any) {
        if (typeof schema !== 'string') schema = schema['@id'];
        //@ts-ignore
        const lastIdObject = yield self.selectObjects({
          entConstrs: [{
            schema,
            variables: {
              identifier: 'dcterms:identifier',
            },
          }],
          orderBy: [{ expression: variable('identifier0'), descending: true }],
          limit: 1,
        });
        return lastIdObject.length === 0 ? 0 : lastIdObject[0].identifier as number;
      }),*/
      

      /**
       * Удаляет ВСЕ триплы для заданного URI, соответствующего набору значений полей из conditions
       * @param data: {
       *    schema -- JSON схема с RDF классоми и определениями RDF свойств
       *    conditions -- объект с полями для условия поиска
       * }
       */
      /*deleteObject: flow(function* deleteObject(data: any) {
        //@ts-ignore
        const collConstr = self.addCollConstr(data);
        const response = yield collConstr.deleteObject();
        //@ts-ignore
        self.removeCollConstr(collConstr);
        return response;
      }),*/

      /**
       * Создает объект в соответствии с классом из schema и значениями полей из data
       * URI генерируется автоматически
       * Текущий пользователь и текущее время устанавливаются как создатель и автор изменений, время создания и изменения
       * @param data: {
       *    schema -- JSON схема с RDF классоми и определениями RDF свойств
       *    data -- объект с данными для создания и сохранения
       * }
       */
      /*createObject: flow(function* createObject(data: any) {
        const collConstr = normalizeCollConstr(data);
        //const now = moment().toISOString();
        for (let index = 0; index < collConstr.entConstrs.length; index++) {
          const constr = collConstr.entConstrs[index];
          if (constr.schema && constr.data) {
            let schema: any = constr.schema;
            if (typeof constr.schema === 'string') schema = self.schemas.getOrLoadSchemaByIri(schema);
            if (schema) {
              schema = getSnapshot(schema);
              setPropertyIfExistsAndUnset(schema, '@_id', constr.data, abbreviateIri(deAbbreviateIri(nsRouter(schema), self.ns.currentJs) + '_' + uuid62.v4(), self.ns.currentJs));
              //setPropertyIfExistsAndUnset(schema, 'created', s.data, now);
              //setPropertyIfExistsAndUnset(schema, 'creator', s.data, server.user.login);
              //setPropertyIfExistsAndUnset(schema, 'modified', s.data, now);
              //setPropertyIfExistsAndUnset(schema, 'modifiedBy', s.data, server.user.login);
              //setPropertyIfExistsAndUnset(schema, 'processArea', s.data, server.processArea);

              if (schema.properties.identifier !== undefined && constr.data.identifier === undefined) {
                //@ts-ignore
                const id = yield self.selectMaxObjectId('rm:ArtifactShape');
                //console.debug('id', id);
                constr.data.identifier = id + 1;
              }
            }
          }
        }
        let qid = collConstr['@id'];
        self.collsConstr.set(qid, collConstr as any);
        const collConstr2 = self.collsConstr.get(qid);
        if (!collConstr2) throw new Error('Cannot create query object in model');

        const response = yield collConstr2.createObject();
        //console.debug(response);
        //@ts-ignore
        const objects = yield self.selectObjects({
          schema: collConstr.entConstrs[0].schema,
          conditions: {
            '@_id': collConstr.entConstrs[0].data['@_id'],
          }
        });
        //@ts-ignore
        self.removeCollConstr(collConstr2);     
        return objects.length === 1 ? objects[0] : objects;
      }),*/

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
      /*updateObject: flow(function* updateObject(data: any) {
        if (data.entConstrs && isArray(data.entConstrs)) {
          const now = moment().toISOString();
          data.entConstrs.forEach((s: any) => {
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
        const collConstr = self.addCollConstr(data);
        const response = yield collConstr.updateObject();
        //@ts-ignore
        self.removeCollConstr(collConstr);
        return response;
      }),*/
    };
  });

export interface IRepository extends Instance<typeof Repository> {}

function addMissingId(data: any | undefined) {
  if (data && typeof data === 'object' && !data['@id']) data['@id'] = '_' + uuid62.v4();
}
