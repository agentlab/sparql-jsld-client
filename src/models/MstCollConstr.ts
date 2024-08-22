/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { assign, cloneDeep, omit, transform } from 'lodash-es';
import {
  types,
  getSnapshot,
  getEnv,
  getRoot,
  Instance,
  SnapshotOut,
  IAnyStateTreeNode,
  IAnyModelType,
} from 'mobx-state-tree';

import { addMissingId, JsObject } from '../ObjectProvider';
import { ISchemas, MstJSONSchema7forRdf, MstJSONSchema7forRdfReference } from './MstSchemas';
import { ICollConstrJs } from '../SparqlGen';
import { constructObjectsQuery, selectObjectsQuery } from '../SparqlGenSelect';
import { insertObjectQuery, deleteObjectQuery, updateObjectQuery } from '../SparqlGenUpdate';
import { SparqlClient } from '../SparqlClient';

export const MstJsObject = types.frozen<any>();
export const MstMapOfJsObject = types.map(MstJsObject);

/**
 * Entity Constraint, part of Collection Constraint (CollConstr)
 */
export const MstEntConstr = types
  .model('MstEntConstr', {
    /**
     * IRI of entity constraint
     */
    '@id': types.identifier,
    /**
     * IRI of a type of entity constraint. Should be 'aldkg:EntConstr' or undefined
     */
    '@type': types.maybe(types.string),
    /**
     * IRI of a parent entity constraint
     */
    '@parent': types.safeReference(types.late((): IAnyModelType => MstEntConstr)),
    /**
     * could be class IRI, resolved from local schema repository (local cache) or from server
     * or could be 'private' schema (full qualified JS object)
     */
    schema: types.union(MstJSONSchema7forRdfReference, MstJSONSchema7forRdf),
    /**
     * Obj property corresponds schema property
     * Obj value -- constrain value:
     *   simple value: simple constrain
     *   object value:
     *     json-ld object (with '@id' and '@type') will be replaced with a value of '@id' property
     *     filter object used for complex constrains like ranges, enums, etc.
     *   undefined value -- special case -- remove constrain property with undefined value from conditions
     *   null value -- special case -- indicates partial (unfinished) constrain, which should not be selected from the server.
     *                 Reactive changes in conditions will be ignored by client and dataInternal will return an empty array.
     */
    conditions: types.optional(MstMapOfJsObject, {}),
    /**
     * if null, use all schema props
     * if empty {}, not use schema props
     * if { kk: null }
     * if { kk: val }
     */
    variables: types.union(MstMapOfJsObject, types.undefined),
    data: types.optional(MstMapOfJsObject, {}),
    /**
     * Ordered array of order clauses
     * If last digit not specified, we assuming '0' (identifier0)
     */
    orderBy: types.maybe(types.array(types.frozen<any>())),
    limit: types.maybe(types.number),
    offset: types.maybe(types.number),
    distinct: types.maybe(types.boolean),
    /**
     * manual federation in query
     */
    service: types.maybe(types.string),
    /**
     * Retrieve DirectType class (lowest in the class hierarchy).
     */
    resolveType: types.maybe(types.boolean),
  })
  .views((self) => {
    return {
      get schemaJs() {
        return self.schema ? getSnapshot(self.schema) : undefined;
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
    };
  })
  .actions((self) => {
    //let disp: any;
    return {
      /*afterAttach() {
        console.log('MstEntConstr afterAttach, @id=', self['@id']);
        disp = reaction(
          () => getSnapshot(self.conditions),
          (newVal: any, oldVal: any) => {
            console.log('MstEntConstr.conditions changed, reload data', { newVal, oldVal });
            //@ts-ignore
            //self.loadColl();
          },
          { fireImmediately: false },
        );
      },
      beforeDetach() {
        //console.log('MstEntConstr beforeDetach, @id=', self['@id']);
        //if (disp) disp();
      },*/
    };
  });

export type IEntConstr = Instance<typeof MstEntConstr>;

/**
 * Collection Constraint
 */
export const MstCollConstr = types
  .model('MstCollConstr', {
    /**
     * IRI of collection constraint
     */
    '@id': types.identifier,
    /**
     * IRI of a type of collection constraint. Should be 'aldkg:CollConstr'
     */
    '@type': types.maybe(types.string),
    /**
     * IRI of a parent entity constraint
     */
    '@parent': types.safeReference(types.late((): IAnyModelType => MstCollConstr)),
    /**
     * Ordered (!) array of entity constraints. Could be linked by conditions fields
     */
    entConstrs: types.array(MstEntConstr),
    /**
     * Ordered array of order clauses
     * If last digit not specified, we assuming '0' (identifier0)
     */
    orderBy: types.maybe(types.array(types.frozen<any>())),
    limit: types.maybe(types.number),
    offset: types.maybe(types.number),
    distinct: types.maybe(types.boolean),
    /**
     * RDF4J REST API options
     */
    options: types.union(types.map(types.string), types.undefined),
  })

  /**
   * Views
   */
  .views((self) => {
    const rep: IAnyStateTreeNode = getRoot(self);
    const client = getEnv(self).client;
    return {
      get optionsJs() {
        return self.options ? getSnapshot(self.options) : undefined;
      },
      get client() {
        return client;
      },
      get rep() {
        return rep;
      },
      get nsJs() {
        return rep.ns.currentJs;
      },
      get coll() {
        return rep.getColl(self['@id']);
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {
    let disp: any;
    return {
      /*afterAttach() {
        console.log('MstCollConstrs afterAttach, @id=', self['@id']);
        disp = reaction(
          () => self.entConstrs,
          () => {
            console.log('MstCollConstrs.entConstrs changed, reload data');
            //@ts-ignore
            //self.loadColl();
          },
          { fireImmediately: false },
        );
      },
      beforeDetach() {
        console.log('MstCollConstr Detach', self['@id']);
        if (disp) disp();
      },*/
      setLimit(limit: number) {
        self.limit = limit;
      },
      /**
       * SELECT
       */
      /**
       *
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
                    repository.removeColl(collConstr);
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

export type ICollConstr = Instance<typeof MstCollConstr>;
export type ICollConstrSnapshotOut = SnapshotOut<typeof MstCollConstr>;

/**
 * Smart deep-merge parent CollConstr and it's entConstrs into child CollConstr.
 * Skip all JSON-LD props, starts with  '@'.
 * @param collConstrJs
 * @param parentCollConstrJs
 * @returns
 */
function mergeCollConstrs(
  collConstrJs: ICollConstrSnapshotOut,
  parentCollConstrJs: ICollConstrSnapshotOut,
): ICollConstrSnapshotOut {
  // deep-merge entConstrs props, based on parent order of EntConstrs
  (collConstrJs.entConstrs as any) = parentCollConstrJs.entConstrs
    .map((parentEntConstrJs) => {
      let entConstrJs = collConstrJs.entConstrs.find(
        (entConstrJs) => entConstrJs['@parent'] === parentEntConstrJs['@id'],
      );
      if (entConstrJs) {
        entConstrJs = transform(
          omit(parentEntConstrJs, ['@id', '@type', '@parent']),
          (result: any, value: any, key: string) => {
            // override props: schema, resolveType
            if (key === 'schema' && value) result[key] = value;
            else if (key === 'resolveType' && value) result[key] = value;
            // deep-merge props for objects in props: conditions, variables, data
            else if (value !== undefined && !!Object.keys(value).length) {
              result[key] = assign(result[key], omit(value, ['@id', '@type', '@parent']));
              addMissingId(result[key]);
            }
          },
          entConstrJs,
        );
      } else entConstrJs = parentEntConstrJs; // add non-extended parent EntConstr
      return entConstrJs;
    })
    .concat(collConstrJs.entConstrs.filter((entConstrJs) => entConstrJs['@parent'] === undefined));

  // override props (due to MST props exists in parent but set to undefined)
  if (parentCollConstrJs.distinct !== undefined) collConstrJs.distinct = parentCollConstrJs.distinct;
  if (parentCollConstrJs.options !== undefined)
    collConstrJs.options = assign(collConstrJs.options, parentCollConstrJs.options);
  // set default props if unset
  if (collConstrJs.orderBy === undefined && parentCollConstrJs.orderBy !== undefined)
    collConstrJs.orderBy = parentCollConstrJs.orderBy;
  if (collConstrJs.limit === undefined && parentCollConstrJs.limit !== undefined)
    collConstrJs.limit = parentCollConstrJs.limit;
  if (collConstrJs.offset === undefined && parentCollConstrJs.offset !== undefined)
    collConstrJs.offset = parentCollConstrJs.offset;
  return collConstrJs;
}

async function resolveAndClone(self: ICollConstr) {
  const data = getSnapshot<ICollConstrSnapshotOut>(self);
  let parent: any = self['@parent'];
  if (parent) parent = getSnapshot<ICollConstrSnapshotOut>(parent);
  return resolveAndCloneSnapshot(data, parent, self.rep.schemas);
}

async function resolveAndCloneSnapshot(
  data: ICollConstrSnapshotOut,
  parent: ICollConstrSnapshotOut | undefined,
  schemas: ISchemas,
) {
  let collConstrJs: ICollConstrSnapshotOut = cloneDeep(data);
  if (parent) collConstrJs = mergeCollConstrs(collConstrJs, cloneDeep(parent));
  // resolve schema by reference. For-loop because of async-await
  for (let index = 0; index < collConstrJs.entConstrs.length; index++) {
    const entConstrJs = collConstrJs.entConstrs[index];
    let schema: any = entConstrJs.schema;
    if (typeof schema === 'string') {
      const schemaIri = schema;
      schema = schemas.get(schemaIri);
      if (!schema) {
        schema = await schemas.loadSchemaByIri(schemaIri);
        if (!schema) console.error('NULL Schema!!!');
      }
      schema = getSnapshot(schema);
      if (!schema) console.error('NULL Schema!!!');
    }
    // make schema snapshot modifiable again by copying it
    entConstrJs.schema = cloneDeep(schema);
    // convert full object value into IRI value
    if (entConstrJs.conditions) {
      Object.keys(entConstrJs.conditions).forEach((k) => {
        const val = entConstrJs.conditions[k];
        if (typeof val === 'object' && val['@id'] !== undefined && val['@type'] !== undefined) {
          entConstrJs.conditions[k] = val['@id'];
        }
      });
    }
    collConstrJs.entConstrs[index] = entConstrJs;
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
  if (!collConstr || !collConstr.client) {
    console.log('collConstr is null');
  }
  return constructObjectsQuery(collConstrJs, collConstr.nsJs, collConstr.client);
}

/**
 * Validates query and makes request to the server
 * @param collConstr
 * @param parentCollConstr
 * @param schemas
 * @param nsJs
 * @param client
 * @returns [] or null -- if incorrect query in validation and no actual request to the server had been made
 */
export async function constructObjectsSnapshot(
  collConstr: ICollConstrSnapshotOut,
  parentCollConstr: ICollConstrSnapshotOut | undefined,
  schemas: ISchemas,
  nsJs: any,
  client: SparqlClient,
) {
  //CollConstrs correctness pre-check (cond keys with undefined are signs of incorrectness)
  const nullEntConstr = collConstr?.entConstrs?.find(
    (entConstr) =>
      entConstr.conditions &&
      Object.keys(entConstr.conditions).find(
        (condKey) => entConstr.conditions[condKey] === undefined || entConstr.conditions[condKey] === null,
      ),
  );
  const nullEntConstrParent = parentCollConstr?.entConstrs?.find(
    (entConstr: any) =>
      entConstr.conditions &&
      Object.keys(entConstr.conditions).find(
        (condKey) => entConstr.conditions[condKey] === undefined || entConstr.conditions[condKey] === null,
      ),
  );
  if (nullEntConstr || nullEntConstrParent) {
    console.log('constructObjectsSnapshot ignore constr with nulls and undefs', collConstr['@id']);
    return null;
  }
  //TODO: performance
  const collConstrJs = await resolveAndCloneSnapshot(collConstr, parentCollConstr, schemas);
  return constructObjectsQuery(collConstrJs, nsJs, client);
}

/**
 * Delete ALL triples for a specific RDF object, which values corresponds values from conditions
 * @param conditions: JS object with properties, which defines search conditions
 *
 */
export async function deleteObject(collConstr: ICollConstr, conditions?: JsObject | JsObject[], loadIfNeeded = true) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  deleteObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, conditions);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}

export async function deleteObjectSnapshot(
  schemas: ISchemas,
  nsJs: any,
  client: SparqlClient,
  data: ICollConstrSnapshotOut,
  parent: ICollConstrSnapshotOut | undefined,
  conditions?: JsObject | JsObject[],
) {
  //TODO: performance
  const collConstrJs = await resolveAndCloneSnapshot(data, parent, schemas);
  deleteObjectQuery(collConstrJs, nsJs, client, conditions);
}

export async function insertObject(collConstr: ICollConstr, data?: JsObject | JsObject[], loadIfNeeded = true) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  insertObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, data);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}

export async function updateObject(
  collConstr: ICollConstr,
  conditions?: JsObject | JsObject[],
  data?: JsObject | JsObject[],
  loadIfNeeded = true,
) {
  //TODO: performance
  const collConstrJs = await resolveAndClone(collConstr);
  updateObjectQuery(collConstrJs, collConstr.nsJs, collConstr.client, conditions, data);
  //TODO: if collection contains deleted elements, reselect collection
  const coll = collConstr.coll;
  if (loadIfNeeded && coll && !coll.lastSynced) await selectObjects(collConstr);
}
