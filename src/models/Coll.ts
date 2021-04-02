/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import moment from 'moment';
import { types, Instance, flow, getEnv, getRoot, getSnapshot, IAnyStateTreeNode, IAnyComplexType } from 'mobx-state-tree';

import { JsObject } from '../ObjectProvider';
import { CollConstr, constructObjects, constructObjectsSnapshot, deleteObjectSnapshot, ICollConstrSnapshotOut, JsObject2 } from './CollConstr';


export interface MstModels {
  [key: string]: IAnyComplexType;
}
export const mstSchemas: MstModels = {};

export const DataType = types.union(
  { dispatcher: (snapshot) => {
    if (snapshot) {
      const mstModel = mstSchemas[snapshot['@type']];
      if (mstModel) {
        //console.log('DataType, create mstModel for', snapshot['@id'], mstModel.name);
        return mstModel;
      }
    }
    //console.log('DataType, create JsObject2 for', snapshot['@id']);
    return JsObject2; 
  }},
  JsObject2
);

/**
 * Syncronizable/updateabe collection, retrieved from server based on CollConstr with the same '@id'
 * Incapsulates collection constraints, data, sync settings and metadata
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
})
/**
 * Views
 */
.views((self) => {
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
      return self.dataIntrnl.find((e) => e['@id'] === iri);
    },
  };
})
/**
 * Actions
 */
.actions((self) => {
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
      let objects = [];
      if (self.collConstr) {
        const collConstr = getSnapshot<ICollConstrSnapshotOut>(self.collConstr);
        objects = yield constructObjectsSnapshot(collConstr, rep.schemas, rep.ns.currentJs, client);
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
    
    changeCollConstr(constr: any) {
    },

    addElem(elem: JsObject) {
      const existEl = self.dataIntrnl.find((e: any) => e['@id'] === elem['@id']);
      if (!existEl) {
        self.dataIntrnl.push(elem);
      }
    },

    delElem: flow(function* delElem(elem: JsObject | string) {
      if (!elem) return null;
      if (self.collConstr) {
        if (typeof elem !== 'string') elem = elem['@id'];
        let collConstr: any = getSnapshot<ICollConstrSnapshotOut>(self.collConstr);
        // filter-out query modifiers like orderBy, limit...
        collConstr = {
          '@id': collConstr['@id'],
          '@type': collConstr['@type'],
          entConstrs: collConstr.entConstrs,
        };
        yield deleteObjectSnapshot(rep.schemas, rep.ns.currentJs, client, collConstr, {'@_id': elem});
        //@ts-ignore
        return self.delElemInternal(elem);
      }
      return null;
    }),

    delAll() {
    },

    delElemInternal(elem: string) {
      const i = self.dataIntrnl.findIndex((e) => e.get('@id') === elem);
      if (i >= 0) {
        return self.dataIntrnl.spliceWithArray(i, 1)
      }
      return null;
    },
  };
});
export interface IColl extends Instance<typeof Coll> {};
