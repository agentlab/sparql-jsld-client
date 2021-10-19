/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { isArray } from 'lodash-es';
import { values } from 'mobx';
import { types, getSnapshot, applySnapshot, getEnv, Instance } from 'mobx-state-tree';

import { addMissingId, JsObject } from '../ObjectProvider';
import { abbreviateIri } from '../SparqlGen';
import { SparqlClient } from '../SparqlClient';

import { MstColl } from './MstColl';
import { MstNamespaces } from './MstNamespaces';
import { MstSchemas } from './MstSchemas';

export const User = types.model('User', {
  login: types.identifier,
  name: types.string,
});

export function setPropertyIfExistsAndUnset(schema: any, propKey: string, data: any, value: any) {
  const schemaKey = propKey !== '@_id' ? propKey : '@id';
  if (schema.properties[schemaKey] !== undefined && data[propKey] === undefined) data[propKey] = value;
  return data[propKey];
}

export const MstRepository = types
  .model('MstRepository', {
    repId: types.string,
    user: User,
    //processArea: types.string,
    ns: MstNamespaces,
    schemas: MstSchemas,

    /**
     * Internal colls map.
     * Use <code>rep.getColl(iri)</code> instead of <code>rep.colls.get(iri)</code>
     */
    colls: types.map(MstColl),
    editingData: types.map(types.boolean),

    selectedData: types.map(types.frozen<any>()),
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
        if (!iriOrCollConstr) return undefined;
        const iri = typeof iriOrCollConstr === 'string' ? iriOrCollConstr : iriOrCollConstr['@id'];
        const coll = self.colls.get(iri);
        return coll;
      },

      getSelectedDataJs(iri: string) {
        if (!iri) return undefined;
        const coll = this.getColl(iri);
        if (!coll) return undefined;
        const id = self.selectedData.get(iri);
        if (id) {
          let data = coll.dataByIri(id);
          if (data) data = getSnapshot(data);
          return data;
        }
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
        const ccId = collConstr['@id'];
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

      //TODO: Is it possible to unify it with addColl?
      addCollByConstrRef(constr: any, opt: JsObject = {}, data: JsObject[] = []) {
        const ccId = typeof constr === 'object' ? constr['@id'] : constr;
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
      //////////  Selection Service  ///////////

      setSelectedData(iri: string, data: any) {
        console.log('setSelectedData START', { iri, data });
        if (iri /*&& */) {
          //let id: string;
          //if (typeof data === 'string') {
          //  id = data;
          //} else {
          //  id = data['@id'];
          //
          //if (id && typeof id === 'string') {
          //  self.selectedData.set(iri, id);
          //  console.log('setSelectedData UPDATE', { iri, id });
          //}
          self.selectedData.set(iri, data);
        }
        console.log('setSelectedData END', { iri, data });
      },
      //////////  FORM  ///////////
      onSaveFormData(formId: string) {},
      onCancelForm(id: string) {},
      setEditing(schemaUri: string, state: boolean, reset = false) {
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

      /**
       * Edit Connection
       * @param viewElement
       * @param scope
       * @param c
       * @param from
       * @param by
       */
      editConn(connections: any[], data: any) {
        //console.log('editConn START with data=', { connections, data });
        connections.forEach((conn: any) => {
          const toId = conn.toObj;
          let value = conn.fromProp === undefined || data === undefined || data === null ? data : data[conn.fromProp];
          //console.log('editConn conn with id=', toId);
          const node: any = values(self.colls).find((coll: any) => {
            //console.log('editConn coll=', getSnapshot(coll));
            //console.log('editConn collConstr=', getSnapshot(coll.collConstr));
            //console.log('editConn collConstr @id=', coll.collConstr['@id']);
            if (coll.collConstr['@id'] === toId) {
              console.log('editConn found coll.collConstr, ignore it');
              return true;
            }
            return values(coll.collConstr.entConstrs).find((entConstr: any) => {
              //console.log('editConn entConstr=', getSnapshot(entConstr));
              //console.log('editConn entConstr @id=', entConstr['@id']);
              if (entConstr['@id'] === toId) {
                //console.log('editConn found entConstr');
                if (conn.toProp === 'schema') {
                  if (typeof value === 'object') value = value['@type'];
                  //console.log('editConn entConstr schema settings found for id=', value);
                  let schema = (self as any).schemas.json.get(value);
                  //console.log('editConn entConstr schema found=', schema);
                  if (!schema) {
                    schema = (self as any).schemas.class2schema.get(value); // maybe value is a class
                    //console.log('editConn entConstr schema for class found=', schema);
                  }
                  if (!schema) {
                    //console.log('editConn entConstr schema value=', schema);
                    schema = value;
                  }
                  //entConstr.schema = schema;
                  let entConstrJs: any = getSnapshot(entConstr);
                  entConstrJs = {
                    ...entConstrJs,
                  };
                  if (value !== undefined) {
                    console.log('editConn set key=', conn.toProp);
                    //entConstrJs[conn.toProp] = value;
                  } else {
                    //console.log('editConn delete key=', conn.toProp);
                    delete entConstrJs[conn.toProp];
                  }
                  console.log('editConn set new entConstr by conn', { entConstrJs, conn });
                  applySnapshot(entConstr, entConstrJs);
                  //console.log('editConn applied entConstr=', entConstrJs);
                }
                /*let entConstrJs: any = getSnapshot(entConstr);
                entConstrJs = {
                  ...entConstrJs,
                };
                if (value !== undefined) {
                  console.log('editConn set key=', conn.toProp);
                  entConstrJs[conn.toProp] = value;
                } else {
                  console.log('editConn delete key=', conn.toProp);
                  delete entConstrJs[conn.toProp];
                }
                console.log('editConn new entConstr=', entConstrJs);
                applySnapshot(entConstr, entConstrJs);
                console.log('editConn applied entConstr=', entConstrJs);*/
                return true;
              }
              //console.log('editConn conditions=', getSnapshot(entConstr.conditions));
              //console.log('editConn conditions @id=', entConstr.conditions['@id']);
              //console.log('editConn conditions snpsht @id=', (getSnapshot(entConstr.conditions) as any)['@id']);
              //console.log('editConn conditions get @id=', entConstr.conditions.get('@id'));
              if (entConstr.conditions.get('@id') === toId) {
                //console.log('editConn found conditions');
                const node = entConstr.conditions;
                //console.log('editConn node found=', node);
                let condition: any = getSnapshot(node);
                condition = {
                  ...condition,
                };
                if (value !== undefined) {
                  //console.log('editConn set key=', conn.toProp);
                  condition[conn.toProp] = value;
                } else {
                  //console.log('editConn delete key=', conn.toProp);
                  delete condition[conn.toProp];
                }
                console.log('editConn set new condition by conn', { condition, conn });
                applySnapshot(node, condition);
                //console.log('editConn applied condition=', condition);
                return true;
              }
              return false;
            });
          });
          //if (node) {
          //  console.log('editConn node found=', node);
          //  let condition: any = getSnapshot(node);
          //  condition = {
          //    ...condition,
          //  };
          //  condition[conn.toProp] = value;
          //  console.log('editConn new condition=', condition);
          //  applySnapshot(node, condition);
          //  console.log('editConn applied condition=', condition);
          //}
          //console.log('editConn END');
        });
      },

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
       *    schema -- JSON схема с RDF классами и определениями RDF свойств
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
       *    schema -- JSON схема с RDF классами и определениями RDF свойств
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

export type IRepository = Instance<typeof MstRepository>;
