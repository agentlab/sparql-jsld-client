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
import isArray from 'lodash/isArray';

import { types, getEnv, Instance } from 'mobx-state-tree';

import { JsObject } from '../ObjectProvider';
import { abbreviateIri } from '../SparqlGen';
import { SparqlClient } from '../SparqlClient';

import { Coll } from './Coll';
import { Namespaces } from './Namespaces';
import { Schemas } from './Schemas';

export const User = types.model('User', {
  login: types.identifier,
  name: types.string,
});

export function setPropertyIfExistsAndUnset(schema: any, propKey: string, data: any, value: any) {
  const schemaKey = propKey !== '@_id' ? propKey : '@id';
  if (schema.properties[schemaKey] !== undefined && data[propKey] === undefined) data[propKey] = value;
  return data[propKey];
}

export const Repository = types
  .model('Repository', {
    repId: types.string,
    user: User,
    //processArea: types.string,
    ns: Namespaces,
    schemas: Schemas,

    /**
     * Internal colls map.
     * Use <code>rep.getColl(iri)</code> instead of <code>rep.colls.get(iri)</code>
     */
    colls: types.map(Coll),
    editingData: types.map(types.boolean),
  })
  /**
   * Views
   */
  .views((self) => {
    return {
      /**
       * Returns collection
       * @param iriOrCollConstr
       */
      getColl(iriOrCollConstr: string | any) {
        const iri = typeof iriOrCollConstr === 'string' ? iriOrCollConstr : iriOrCollConstr['@id'];
        const coll = self.colls.get(iri);
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

    const normalizeCollConstr = (data: any) => {
      let collConstr: any; // ICollConstr
      if (!data.entConstrs) {
        if (typeof data === 'string') {
          collConstr = {
            entConstrs: [
              {
                schema: abbreviateIri(data, self.ns.currentJs),
              },
            ],
          };
        } else if (isArray(data)) {
          collConstr = { entConstrs: [...data] }; // data as IEntityConstr[]
        } else {
          if (data.$schema === undefined) {
            collConstr = { entConstrs: [data as any] }; // data as IEntityConstr
          } else {
            collConstr = {
              entConstrs: [
                {
                  schema: data,
                },
              ],
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
    };

    return {
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
      addColl(constr: any, opt: JsObject = {}, data: JsObject[] = []) {
        const collConstr = normalizeCollConstr(constr);
        /*for(let i = 0; i < query.entConstrs.length; i++) {
          const constr: any = query.entConstrs[i];
          if (typeof constr.schema === 'string') {
            yield self.schemas.getSchemaByIri(constr.schema);
          }
        };*/
        let ccId = collConstr['@id'];
        //const schemas = getSnapshot(self.schemas);
        const collJs: any = {
          '@id': ccId,
          collConstr,
          ...opt,
          dataIntrnl: data,
          //schema: {},
        };
        const collObs = self.colls.put(collJs);
        if (!collObs) throw new Error('Cannot create query object in model');
        //const c = getSnapshot(collObs);
        return collObs;
      },

      addCollByConstrRef(constr: any, opt: JsObject = {}, data: JsObject[] = []) {
        let ccId = constr['@id'];
        if (self.colls.has(ccId)) {
          console.warn('Attempt to replace coll: ignored', constr);
          return;
        }
        //const schemas = getSnapshot(self.schemas);
        const collJs: any = {
          '@id': ccId,
          collConstr: ccId,
          ...opt,
          dataIntrnl: data,
          //schema: {},
        };
        const collObs = self.colls.put(collJs);
        if (!collObs) throw new Error('Cannot create query object in model');
        //const c = getSnapshot(collObs);
        return collObs;
      },

      /**
       * Remove Coll by IRI or object with IRI
       * @param coll -- Coll or CollConstr object or IRI
       */
      removeColl(coll: string | any) {
        const id = typeof coll === 'string' ? coll : coll['@id'];
        if (id) {
          self.colls.delete(id);
        }
      },

      saveData(schemaUri: string) {},
      selectData(schemaUri: string, data: any) {},
      //////////  FORM  ///////////
      onSaveFormData(formId: string) {},
      onCancelForm(id: string) {},
      setEditing(schemaUri: string, state: boolean, reset: boolean = false) {
        if (self.editingData.get(schemaUri) !== state) {
          self.editingData.set(schemaUri, state);
          //if (schemaUri === 'root' && this.setParentEditing) {
          //  self.setParentEditing(state);
          //}
          //if (this.saveLogicTree[schemaUri] && this.saveLogicTree[schemaUri].parent) {
          //  this.setEditingChanges(this.saveLogicTree[schemaUri].parent as string, state, schemaUri);
          //}
          //if (reset) {
          //  this.resetEditingChanges(schemaUri);
          //}
        }
      },
      setModalVisible(uri: string, state: boolean) {},
      setOnValidate(form: string, id: string, state: boolean) {},
      onChangeData(path: string, data: any) {},
      setSaveLogic(parent: string, child: string) {},
      setEditingChanges(parentUri: string, state: boolean, childUri: string) {},
      onChangeFormData(form: string, path: string, data: any) {},
      resetEditingChanges(schemaUri: string) {},

      /*loadColl: flow(function* loadColl(iriOrCollConstr: string | any) {
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
      }),*/

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
        self.removeColl(collConstr);
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
        self.removeColl(collConstr);
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
        self.removeColl(collConstr2);     
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
        self.removeColl(collConstr);
        return response;
      }),*/
    };
  });

export interface IRepository extends Instance<typeof Repository> {}

function addMissingId(data: any | undefined) {
  if (data && typeof data === 'object' && !data['@id']) data['@id'] = '_' + uuid62.v4();
}
