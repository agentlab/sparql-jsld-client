/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import dayjs from 'dayjs';
import { isEqual } from 'lodash-es';
import { reaction } from 'mobx';
import {
  applySnapshot,
  types,
  Instance,
  flow,
  getEnv,
  getSnapshot,
  IAnyStateTreeNode,
  IAnyComplexType,
  isLiteralType,
  isMapType,
  getType,
  isModelType,
} from 'mobx-state-tree';

import { JsObject } from '../ObjectProvider';
import {
  MstCollConstr,
  constructObjectsSnapshot,
  deleteObjectSnapshot,
  TMstCollConstrSnapshotOut,
  MstMapOfJsObject,
} from './MstCollConstr';
import { getParentOfName } from './Utils';

export function getMstLiteralPropValue(mstModel: any, name: string) {
  const prop = mstModel?.properties[name];
  if (prop && isLiteralType(prop)) {
    return (prop as any).value;
  }
  return undefined;
}

export type MstModels = Record<string, IAnyComplexType>;

const mstCollSchemas: MstModels = {};

export function registerMstCollSchema(mstModel: IAnyComplexType): void {
  const id = getMstLiteralPropValue(mstModel as any, '@type');
  if (id) {
    console.log('register mstCollSchema', { id, t: mstModel });
    mstCollSchemas[id] = mstModel;
  } else {
    console.log('cannot register mstCollSchema', { mstModel });
  }
}

export function unregisterMstCollSchema(id: string): IAnyComplexType {
  const t = mstCollSchemas[id];
  delete mstCollSchemas[id];
  return t;
}

export const MstCollDataType = types.union(
  {
    dispatcher: (snapshot: any) => {
      if (snapshot) {
        const mstModel = mstCollSchemas[snapshot['@type']];
        if (mstModel) {
          //console.log('DataType, create mstModel for', snapshot['@id'], mstModel.name);
          return mstModel;
        }
      }
      //console.log('DataType, create JsObject2 for', snapshot['@id']);
      return MstMapOfJsObject;
    },
  },
  MstMapOfJsObject,
);

/**
 * Syncronizable/updatable collection, retrieved from server based on CollConstr with the same '@id'
 * Encapsulates collection constraints, data, sync settings and metadata
 */
export const MstColl = types
  .model('MstColl', {
    /**
     * Collection id, the same as collConstr's id
     */
    '@id': types.identifier,

    /**
     * Collection constraint. Use this object as an observable
     */
    collConstr: types.union(MstCollConstr, types.safeReference(MstCollConstr)),

    /**
     * Update from server period in seconds
     * undefined -- do not update from server at all
     */
    updPeriod: types.optional(types.number, 300),

    /**
     * Update from server on first data access (true) or immediately (false)
     */
    lazy: types.optional(types.boolean, true),

    /**
     * Should populate 'index' map
     */
    //indexed: types.optional(types.boolean, false),

    /**
     * Internal data array. Do not retrieve data on first access.
     * Use <code>coll.data</code> getter instead of <code>coll.dataIntrnl</code>
     */
    dataIntrnl: types.array(MstCollDataType),

    /**
     * Index data entries (data references) by '@id' (element iri)
     * Populated if 'indexed' is enabled
     */
    //index: types.map(types.reference(DataType)),

    /**
     * Last synced with the server date-time
     */
    lastSynced: types.maybe(types.number),

    /**
     * If CollConstr has changed and data is loading
     */
    isLoading: types.optional(types.boolean, false),

    pageSize: types.optional(types.number, 500),
    /**
     * Add colls to the repository for the discovered in dataIntrnl CollConstrs.
     */
    resolveCollConstrs: types.optional(types.boolean, true),
  })
  /**
   * Views
   */
  .views((self) => {
    return {
      /**
       * Returns collection objects
       * Preloads collection lazily and asynchronously
       */
      get data() {
        // first-time load
        if (self.updPeriod > 0 && !self.lastSynced) {
          // TODO: this is ugly, but workaround the idea that views should be side effect free.
          // We need a more elegant solution.
          setImmediate(() => {
            //@ts-ignore
            self.loadColl();
          });
        }
        return self.dataIntrnl;
      },
      get dataJs() {
        return getSnapshot<JsObject[]>(this.data);
      },
      dataByIri(iri: string) {
        return self.dataIntrnl.find((e) => {
          // should take care of different element type API differences
          const eType = getType(e);
          if (isMapType(eType)) return e.get('@id') === iri; // [] returns undef in MST Map
          if (isModelType(eType)) return (e as any)['@id'] === iri; // .get() returns exception in MST Model
          const eSnp = getSnapshot<JsObject>(e); // MST Frozen???
          return eSnp['@id'] === iri;
        });
      },
    };
  })
  /**
   * Actions
   */
  .actions((self) => {
    const rep: IAnyStateTreeNode = getParentOfName(self, 'MstRepository');
    //console.log('MstColl-rep', rep);
    const client = getEnv(self).client;
    let dispose: any;
    return {
      afterAttach() {
        //console.log('MstColl afterAttach, @id=', self['@id']);
        // first-time load
        if (self.lazy === false) {
          setImmediate(() => {
            //@ts-ignore
            self.loadColl();
          });
        }
        dispose = reaction(
          () => {
            const collConstr = self.collConstr;
            const collConstrJs = collConstr ? getSnapshot(collConstr) : undefined;
            //console.log('Coll reaction', collConstrJs);
            return collConstrJs;
          },
          (newVal: any, oldVal: any) => {
            // ignore if its internal loadMore()
            if (
              !self.isLoading &&
              (!isEqual(newVal.entConstrs, oldVal.entConstrs) ||
                !isEqual(newVal.orderBy, oldVal.orderBy) ||
                (newVal.limit !== oldVal.limit && self.dataIntrnl.length !== newVal.limit))
            ) {
              //console.log('MstColl.collConstr changed, reload data', { newVal, oldVal });
              setImmediate(() => {
                //@ts-ignore
                self.loadColl();
              });
            } /*else {
              console.log('MstColl.collConstr changed, skip', { newVal, oldVal });
            }*/
          },
          { fireImmediately: false, name: 'MstColl-Attach' },
        );
        //TODO: indexation is not working due to complex reference type
        /*if(self.dataIntrnl.length > 0 && self.indexed) {
        self.dataIntrnl.forEach((d: any) => {
          const d2 = self.index.get(d['@id']);
          if (d2 !== d) {
            self.index.set(d['@id'], {'@id': d['@id']});
            console.log('jlkj');
          }
        });
      }*/
      },
      beforeDetach() {
        //console.log('MstColl beforeDetach, @id=', self['@id']);
        if (dispose) dispose();
      },
      loadColl: flow(function* loadColl() {
        // do not mess with other loading process in this coll
        if (self.isLoading) {
          //console.log('loadColl isLoading=true, Skip');
          return;
        }
        //console.log('loadColl START');
        self.isLoading = true;
        if (self.collConstr) {
          const collConstr = getSnapshot<TMstCollConstrSnapshotOut>(self.collConstr);
          let parent: any | undefined = self.collConstr['@parent'];
          if (parent) parent = getSnapshot<TMstCollConstrSnapshotOut>(parent);
          //console.log('loadColl query', { collConstr, parent });
          try {
            const objects: JsObject[] | null = yield constructObjectsSnapshot(
              collConstr,
              parent,
              rep.schemas,
              rep.ns.currentJs,
              client,
            );
            if (objects === null) applySnapshot(self.dataIntrnl, []);
            else applySnapshot(self.dataIntrnl, objects);
            //schema: {},
            //selectQuery: '',
            self.lastSynced = dayjs().valueOf();
            //console.log('loadColl', objects.length);
          } catch (e) {
            console.error(e);
          }
        } else {
          console.warn('loadColl: self.collConstr is undefined');
        }
        if (self.isLoading) self.isLoading = false;
        //console.log('loadColl END');
      }),

      loadMore: flow(function* loadMore() {
        // do not mess with other loading process in this coll
        if (self.isLoading) {
          //console.log('loadMore isLoading=true, Skip');
          return;
        }
        //console.log('loadMore START');
        self.isLoading = true;
        if (self.collConstr) {
          const collConstr = {
            ...getSnapshot<TMstCollConstrSnapshotOut>(self.collConstr),
            limit: self.pageSize,
            offset: self.dataIntrnl.length,
          };
          let parent: any = self.collConstr['@parent'];
          if (parent) parent = getSnapshot<TMstCollConstrSnapshotOut>(parent);
          //console.log('loadMore query', { collConstr, parent });
          try {
            const objects: JsObject[] | null = yield constructObjectsSnapshot(
              collConstr,
              parent,
              rep.schemas,
              rep.ns.currentJs,
              client,
            );
            if (objects !== null) {
              // it seems, we could have some duplicates in loadMore series in case with concurrent updates
              const objectsToAdd: any[] = objects.filter(
                (o: any) => !self.dataIntrnl.some((d: any) => d.get('@id') === o['@id']), // d is a MapType object
              );
              if (objectsToAdd.length > 0) {
                self.dataIntrnl.push(...objectsToAdd);
                if (self.collConstr.limit) {
                  // triggers reaction from afterAttach but we filter it out there in that reaction
                  self.collConstr.setLimit(self.dataIntrnl.length);
                }
              }
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          console.warn('loadMore: self.collConstr is undefined');
        }
        if (self.isLoading) self.isLoading = false;
        //console.log('loadMore END');
      }),

      changeCollConstr(constr: any) {},

      /**
       * Adds single element or elements array with unique @id into Coll's dataInternal
       * Replaces elements with the same @id if values are different
       * @param elems -- element or element array
       */
      addElems(elems: JsObject | JsObject[]) {
        if (!elems) return;
        if (!Array.isArray(elems)) elems = [elems];
        const newElems: JsObject[] = [];
        elems.forEach((elem: JsObject) => {
          const existedElemIndx = self.dataIntrnl.findIndex((e: any) => e.get('@id') === elem['@id']);
          if (existedElemIndx === -1) {
            newElems.push(elem);
          } else {
            //@ts-ignore
            self.updElemByIndx(existedElemIndx, elem);
          }
        });
        if (newElems.length > 0) self.dataIntrnl.push(...newElems);
      },

      /**
       * Delete element from Coll by string @id or @id property in object
       * @param elem -- object with @id or string id
       * @returns deleted object or null if no deletion occurred
       */
      delElem: flow(function* delElem(elem: JsObject | string) {
        if (!elem || !self.collConstr) return null;
        if (typeof elem !== 'string') {
          elem = elem['@id'];
          if (!elem) return null;
        }
        let collConstr: any = getSnapshot<TMstCollConstrSnapshotOut>(self.collConstr);
        // filter-out query modifiers like orderBy, limit...
        collConstr = {
          '@id': collConstr['@id'],
          '@type': collConstr['@type'],
          entConstrs: collConstr.entConstrs,
        };
        let parent: any = self.collConstr['@parent'];
        if (parent) parent = getSnapshot<TMstCollConstrSnapshotOut>(parent);
        yield deleteObjectSnapshot(rep.schemas, rep.ns.currentJs, client, collConstr, parent, { '@_id': elem });
        //@ts-ignore
        return self.delElemInternal(elem);
      }),

      /**
       * Delete all elements from Coll
       */
      delAll() {
        self.dataIntrnl.clear();
      },

      delElemInternal(elem: string) {
        if (!elem) return null;
        const i = self.dataIntrnl.findIndex((e: any) => e.get('@id') === elem);
        if (i >= 0) {
          return self.dataIntrnl.spliceWithArray(i, 1);
        }
        return null;
      },

      /**
       * Update element in Coll by index regardless its @id mismatch
       * @param indx
       * @param elem
       * @returns
       */
      updElemByIndx(indx: number, elem: JsObject) {
        const el = self.dataIntrnl[indx];
        applySnapshot(self.dataIntrnl[indx], elem);
        //self.dataIntrnl.spliceWithArray(indx, 1, [elem]);
        return el;
      },

      /**
       * Update element in Coll with the same @id property as in elem object
       * @param elem -- object with @id property and other properties for update
       * @returns original object before modification or null if no update occurred
       */
      updElem(elem: JsObject) {
        if (!elem || !elem['@id']) return null;
        const i = self.dataIntrnl.findIndex((e: any) => e.get('@id') === elem);
        if (i >= 0) {
          //@ts-ignore
          return self.updElemByIndx(i, elem);
        }
        return null;
      },
    };
  });
export type IColl = Instance<typeof MstColl>;
