/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import moment from 'moment';
import {
  types,
  Instance,
  flow,
  getEnv,
  getRoot,
  getSnapshot,
  IAnyStateTreeNode,
  IAnyComplexType,
  isMapType,
  getType,
  isModelType,
} from 'mobx-state-tree';

import { JsObject } from '../ObjectProvider';
import {
  CollConstr,
  constructObjectsSnapshot,
  deleteObjectSnapshot,
  ICollConstrSnapshotOut,
  JsObject2,
} from './CollConstr';

export interface MstModels {
  [key: string]: IAnyComplexType;
}
const mstSchemas: MstModels = {};

export function registerMstSchema(id: string, t: IAnyComplexType): void {
  console.log('registerMstSchema', { id, t });
  mstSchemas[id] = t;
}

export function unregisterMstSchema(id: string): IAnyComplexType {
  const t = mstSchemas[id];
  delete mstSchemas[id];
  return t;
}

export const DataType = types.union(
  {
    dispatcher: (snapshot: any) => {
      if (snapshot) {
        const mstModel = mstSchemas[snapshot['@type']];
        if (mstModel) {
          console.log('DataType, create mstModel for', snapshot['@id'], mstModel.name);
          return mstModel;
        }
      }
      console.log('DataType, create JsObject2 for', snapshot['@id']);
      return JsObject2;
    },
  },
  JsObject2,
);

/**
 * Syncronizable/updatable collection, retrieved from server based on CollConstr with the same '@id'
 * Encapsulates collection constraints, data, sync settings and metadata
 */
export const Coll = types
  .model('Coll', {
    /**
     * Collection id, the same as collConstr's id
     */
    '@id': types.identifier,

    /**
     * Collection constraint. Use this object as an observable
     */
    collConstr: types.union(CollConstr, types.safeReference(CollConstr)),

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
    dataIntrnl: types.array(DataType),

    /**
     * Index data entries (data references) by '@id' (element iri)
     * Populated if 'indexed' is enabled
     */
    //index: types.map(types.reference(DataType)),

    /**
     * Last synced with the server datetime
     */
    lastSynced: types.maybe(types.number),

    pageSize: types.optional(types.number, 10),
    /**
     * Add colls to the repository for the discovered in dataIntrnl CollConstrs.
     */
    resolveCollConstrs: types.optional(types.boolean, true),
  })
  /**
   * Views
   */
  .views((self: any) => {
    return {
      /**
       * Returns collection objects
       * Preloads collection lazily and asyncronously
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
        return getSnapshot(this.data);
      },
      dataByIri(iri: string) {
        return self.dataIntrnl.find((e: any) => {
          // should take care of different element type API differences
          const eType = getType(e);
          if (isMapType(eType)) return e.get('@id') === iri; // [] returns undef in MST Map
          if (isModelType(eType)) return e['@id'] === iri; // .get() returns exception in MST Model
          const eSnp: any = getSnapshot(e); // MST Frozen???
          return eSnp['@id'] === iri;
        });
      },
    };
  })
  /**
   * Actions
   */
  .actions((self: any) => {
    const rep: IAnyStateTreeNode = getRoot(self);
    const client = getEnv(self).client;
    return {
      afterAttach() {
        // first-time load
        if (self.lazy === false) {
          setImmediate(() => {
            //@ts-ignore
            self.loadColl();
          });
        }
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
      loadColl: flow(function* loadColl() {
        //console.log('loadColl START');
        if (self.collConstr) {
          const collConstr = getSnapshot<ICollConstrSnapshotOut>(self.collConstr);
          const objects: any[] = yield constructObjectsSnapshot(collConstr, rep.schemas, rep.ns.currentJs, client);
          self.dataIntrnl = objects;
          //schema: {},
          //selectQuery: '',
          self.lastSynced = moment.now();
          //console.log('loadColl', objects.length);
        } else {
          console.warn('loadColl: self.collConstr is undifined');
        }
        //console.log('loadColl END');
      }),

      loadMore: flow(function* loadMore() {
        if (self.collConstr) {
          const collConstr = {
            ...getSnapshot<ICollConstrSnapshotOut>(self.collConstr),
            limit: self.pageSize,
            offset: self.dataIntrnl.length,
          };
          const objects: any[] = yield constructObjectsSnapshot(collConstr, rep.schemas, rep.ns.currentJs, client);
          self.dataIntrnl.push(...objects);
          if (self.collConstr.limit) {
            self.collConstr.setLimit(self.dataIntrnl.length);
          }
        }
      }),

      changeCollConstr(constr: any) {},

      /**
       * Adds single element or elements array into Coll's dataInternal
       * @param elem -- element or element array
       */
      addElems(elems: JsObject | JsObject[]) {
        if (!elems) return;
        if (!Array.isArray(elems)) elems = [elems];
        elems = elems.filter((elem: any) => !self.dataIntrnl.find((e: any) => e['@id'] === elem['@id']));
        self.dataIntrnl.push(elems);
      },

      /**
       * Delete element from Coll by string @id or @id property in object
       * @param elem -- object with @id or string id
       * @returns deleted object or null if no deletion occured
       */
      delElem: flow(function* delElem(elem: JsObject | string) {
        if (!elem || !self.collConstr) return null;
        if (typeof elem !== 'string') {
          elem = elem['@id'];
          if (!elem) return null;
        }
        let collConstr: any = getSnapshot<ICollConstrSnapshotOut>(self.collConstr);
        // filter-out query modifiers like orderBy, limit...
        collConstr = {
          '@id': collConstr['@id'],
          '@type': collConstr['@type'],
          entConstrs: collConstr.entConstrs,
        };
        yield deleteObjectSnapshot(rep.schemas, rep.ns.currentJs, client, collConstr, { '@_id': elem });
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
       * Update element in Coll with the same @id property as in elem object
       * @param elem -- object with @id property and other porperties for update
       * @returns original object before modification or null if no update occured
       */
      updElem(elem: JsObject) {
        if (!elem || !elem['@id']) return null;
        const i = self.dataIntrnl.findIndex((e: any) => e.get('@id') === elem);
        if (i >= 0) {
          return self.dataIntrnl.spliceWithArray(i, 1, elem);
        }
        return null;
      },
    };
  });
export type IColl = Instance<typeof Coll>;
