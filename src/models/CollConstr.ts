/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { cloneDeep } from 'lodash';
import { types, flow, getParentOfType, getSnapshot, getEnv, Instance, SnapshotOut, IAnyStateTreeNode, getRoot } from 'mobx-state-tree';

import { JsObject } from '../ObjectProvider';
import { Repository } from './Repository';
import { ISchemas, JSONSchema7forRdf, JSONSchema7forRdfReference } from './Schemas';
import { ICollConstrJs } from '../SparqlGen';
import { constructObjectsQuery, selectObjectsQuery } from '../SparqlGenSelect';
import { insertObjectQuery, deleteObjectQuery, updateObjectQuery } from '../SparqlGenUpdate';
import { Coll } from './Coll';
import { SparqlClient } from 'SparqlClient';


export const JsObject2 = types.map(types.frozen<any>());
//export interface IJsObject2 extends Instance<typeof JsObject2> {}

/**
 * Entity Constraint, part of Collection Constraint (CollConstr)
 */
export const EntConstr = types
  .model('EntConstr', {
    '@id': types.identifier,
    '@type': types.maybe(types.string),
    // could be class IRI, resolved from local schema reposiory (local cache) or from server
    // or could be 'private' schema (full qualified JS object)
    //schema: types.reference(JSONSchema7forRdf),
    schema: types.union(JSONSchema7forRdfReference, JSONSchema7forRdf),
    //schema: types.union(types.reference(types.late(() => JSONSchema7forRdf)), types.late(() => JSONSchema7forRdf)), 
    //schema: types.union(types.string, types.frozen<JSONSchema6forRdf>()),
    conditions: types.optional(JsObject2, {}),
    /**
     * if null, use all schema props
     * if empty {}, not use schema props
     * if { kk: null }
     * if { kk: val }
     */
    variables: types.union(JsObject2, types.undefined),
    data: types.optional(JsObject2, {}),
    /**
     * Дополнительно запрашивать конечный тип объекта (самый "нижний" / специфичный в иерархии наследования).
     * Use instead if selectObjectsWithTypeInfo()
     */
    resolveType: types.maybe(types.boolean),
  })
  .views((self) => ({
    get schemaJs() {
      return self.schema ? getSnapshot(self.schema): undefined;
    },
    get conditionsJs() {
      return getSnapshot(self.conditions);
    },
    get variablesJs() {
      return self.variables ? getSnapshot(self.variables) : undefined;
    },
    get dataJs() {
      return getSnapshot(self.data);
    },
  }));

export interface IEntConstr extends Instance<typeof EntConstr> {};

/**
 * Collection Constraint
 */
export const CollConstr = types
  .model('CollConstr', {
    '@id': types.identifier,
    '@type': types.union(types.string, types.undefined),
    // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
    entConstrs: types.array(EntConstr),
    // if last digit not specified, we assuming '0' (identifier0)
    orderBy: types.union(types.array(types.frozen<any>()), types.undefined),
    limit: types.union(types.number, types.undefined),
    offset: types.union(types.number, types.undefined),
    distinct: types.union(types.boolean, types.undefined),
    //subqueries: types.optional(types.union(types.map(types.late(() => CollConstr)), types.undefined), undefined),
    // RDF4J REST API options
    options: types.union(types.map(types.string), types.undefined),

    //coll: types.reference(types.late(() => Coll)),
  })

  /**
   * Views
   */
  .views((self) => ({
    get optionsJs() {
      return self.options ? getSnapshot(self.options) : undefined;
    },
    
    get client() {
      return getEnv(self).client;
    },
    get repository() {
      const repository: IAnyStateTreeNode = getRoot(self);//getParentOfType(self, Repository);
      return repository;
    },
    get nsJs() {
      const repository = this.repository;
      return repository.ns.currentJs;
    },
    get coll() {
      const repository = this.repository;
      return repository.getColl(self['@id']);//repository.colls.get(self['@id']);
    },
  }))

  /**
   * Actions
   */
  .actions((self) => {
    return {
      /**
       * SELECT
       */
      
      /**
       * Заменяет
       * @param obj
       */
      /*selectObjectsArrayProperties: flow(function* selectObjectsArrayProperties(entConstrs: EntConstrInternal[], objects: JsObject[]) {
        //console.debug('selectObjectsArrayProperties');
        for(let index = 0; index < entConstrs.length; index++){
          const entConstr = entConstrs[index];
          const schema = entConstr.schema;
          const anyContext = schema['@context'];
          const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
          for (const key of Object.keys(entConstr.schemaPropsWithArrays)) {
            for (const object of objects) {
              const prop = entConstr.schemaPropsWithArrays[key];
              const schemaWithArrayProperty: JSONSchema6forRdf = {
                ...schema,
                '@id': '_' + uuid62.v4(),
                '@context': {
                  [key]: context[key],
                },
                properties: {
                  '@id': schema.properties['@id'],
                  [key]: prop,
                },
                required: ['@id', key],
              };
              const propType = getSchemaPropType(schemaWithArrayProperty.properties, context, key);
              if (prop && prop.type && propType) {
                let schemaUri: string | undefined = undefined;
                if ((prop.type === 'array' && prop.items) || (prop.type === 'object')) {
                  schemaUri = repository.schemas.getByClassId(propType);
                  if (!schemaUri) {
                    schemaUri = propType;
                  }
                } else if (prop.type === 'string' && prop.format === 'iri') {
                  schemaUri = propType;
                }
                if (schemaUri) {
                  let schema2: any = repository.schemas.getOrLoadSchemaByIri(schemaUri);
                  if (schema2) {
                    schema2 = getSnapshot(schema2);
                    const collConstr = repository.addCollConstr([
                      {
                        schema: schemaWithArrayProperty,
                        conditions: {
                          '@_id': object['@id'],
                          property: '?eIri1',
                        },
                        variables: {},// ignore schema props in SELECT xxx variables
                      },
                      {
                        schema: schema2,
                      }
                    ]);
                    const subObjects: Results = yield collConstr.selectObjects()
                    repository.removeCollConstr(collConstr);
                    //console.debug('selectObjectsArrayProperties results=', json2str(subObjects));
                    object[key] = subObjects;
                  }
                }
              }
            }
          }
        }
        //console.debug('END selectObjectsArrayProperties');
        return objects;
      }),*/

      /*selectObjects: flow(function* selectObjects() {
        const collConstrJs = resolveAndClone(self as ICollConstr);
        const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, self.nsJs);
        selectInternalEntConstrs(entConstrs);
        const query = selectQueryFromEntConstrs(entConstrs, collConstrJs);
        const queryStr = gen.stringify(query);
        //console.debug('selectObjects query=', queryStr);
        const results: Results = yield client.sparqlSelect(queryStr, self.optionsJs);
        const objects = results.bindings.map((b) => sparqlBindingsToObjectProp(b, entConstrs));
        //process array properties
        //@ts-ignore
        yield self.selectObjectsArrayProperties(entConstrs, objects);
        //console.debug('selectObjects objects_with_arrays=', json2str(objects));
        return objects;
      }),*/

      /*constructObjects: flow(function* constructObjects() {
        const collConstrJs = resolveAndClone(self);
        const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, self.nsJs);
        selectInternalShapes(entConstrs);
        const query = constructQueryFromShapes(entConstrs, collConstrJs);
        const queryStr = gen.stringify(query);
        const results: JsObject[] = yield client.sparqlConstruct(queryStr, self.optionsJs);
        const objects: JsObject[] = yield jsonLdToObjects(results, entConstrs);
        return objects;
      }),*/

      /**
       * DELETE
       */
      /*deleteObject: flow(function* deleteObject(conditions?: JsObject | JsObject[], loadIfNeeded = true) {
        const collConstrJs = resolveAndClone(self as ICollConstr);
        const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, self.nsJs, conditions);
        const query = deleteObjectQuery(entConstrs);
        const queryStr = gen.stringify(query);
        //console.debug('deleteObject query=', queryStr);
        const response: AxiosResponse<any> = yield client.sparqlUpdate(queryStr, collConstrJs.options);
        //TODO: if collection contains deleted elements, reselect collection
        const coll = repository.colls.get(self['@id']);
        //@ts-ignore
        if (loadIfNeeded && coll && !coll.lastSynced) yield self.selectObjects();
        return response;
      }),*/

      /**
       * INSERT
       */
      /*createObject: flow(function* createObject(data?: JsObject | JsObject[], loadIfNeeded = true) {
        const collConstrJs = resolveAndClone(self as ICollConstr);
        const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, self.nsJs, undefined, data);
        const query = insertObjectQuery(entConstrs);
        const queryStr = gen.stringify(query);
        //console.debug('createObject query=', queryStr);
        const response: AxiosResponse = yield client.sparqlUpdate(queryStr, collConstrJs.options);
        //TODO: if collection contains deleted elements, reselect collection
        const coll = repository.colls.get(self['@id']);
        //@ts-ignore
        if (loadIfNeeded && coll && !coll.lastSynced) yield self.selectObjects();
        return response;
      }),*/

     /**
       * UPDATE
       */
      /*updateObject: flow(function* updateObject(conditions?: JsObject | JsObject[], data?: JsObject | JsObject[], loadIfNeeded = true) {
        const collConstrJs = resolveAndClone(self as ICollConstr);
        const entConstrs: EntConstrInternal[] = getInternalCollConstrs(collConstrJs, self.nsJs, conditions, data);
        const query = updateObjectQuery(entConstrs);
        const queryStr = gen.stringify(query);
        //console.debug('updateObject query=', queryStr);
        const response: AxiosResponse = yield client.sparqlUpdate(queryStr, collConstrJs.options);
        //TODO: if collection contains deleted elements, reselect collection
        const coll = repository.colls.get(self['@id']);
        //@ts-ignore
        if (loadIfNeeded && coll && !coll.lastSynced) yield self.selectObjects();
        return response;
      }),*/
    };
  });

export interface ICollConstr extends Instance<typeof CollConstr> {}
export interface ICollConstrSnapshotOut extends SnapshotOut<typeof CollConstr> {}


async function resolveAndClone (self: ICollConstr) {
  const data = getSnapshot<ICollConstrSnapshotOut>(self);
  return resolveAndCloneSnapshot(data, self.repository.schemas);
};

async function resolveAndCloneSnapshot (data: ICollConstrSnapshotOut, schemas: ISchemas) {
  const collConstrJs: ICollConstrSnapshotOut = cloneDeep(data);
  // resolve schema by reference
  for (let index = 0; index < collConstrJs.entConstrs.length; index++) {
    const constrJs = collConstrJs.entConstrs[index];
    let schema: any = constrJs.schema;
    if (typeof schema === 'string') {
      const schemaIri = schema;
      schema = schemas.get(schemaIri);
      if (!schema) {
        schema = await schemas.loadSchemaByIri(schemaIri);
      }
      schema = getSnapshot(schema);
      if (!schema) console.error('NULL Schema!!!');
    }
    // make schema snapshot modifiable again by copying it
    constrJs.schema = cloneDeep(schema);
  }
  return collConstrJs as ICollConstrJs;
}


export async function selectObjects(collConstr: ICollConstr) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  return selectObjectsQuery(collConstrJs, collConstr.nsJs, collConstr.client);
}

export async function constructObjects(collConstr: ICollConstr) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  return constructObjectsQuery(collConstrJs, collConstr.nsJs, collConstr.client);
}

export async function constructObjectsSnapshot(data: ICollConstrSnapshotOut, schemas: ISchemas, nsJs: any, client: SparqlClient) {
  //TODO: performance
  const collConstrJs = await resolveAndCloneSnapshot(data, schemas);
  return constructObjectsQuery(collConstrJs, nsJs, client);
}

/**
 * Удаляет ВСЕ триплы для заданного URI, соответствующего набору значений полей из conditions
 * @param conditions: объект с полями для условия поиска
 * }
 */
export async function deleteObject(collConstr: ICollConstr, conditions?: JsObject | JsObject[], loadIfNeeded = true) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  deleteObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, conditions);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}

export async function insertObject(collConstr: ICollConstr, data?: JsObject | JsObject[], loadIfNeeded = true) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  insertObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, data);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}

export async function updateObject(collConstr: ICollConstr, conditions?: JsObject | JsObject[], data?: JsObject | JsObject[], loadIfNeeded = true) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  updateObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, conditions, data);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}
