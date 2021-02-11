/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { autorun, reaction, when } from 'mobx';
import { applySnapshot, flow, getRoot, getSnapshot, IAnyModelType, IAnyStateTreeNode, Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree';
import moment from 'moment';

import { JsObject } from '../ObjectProvider';
import { Coll } from './Coll';
import { CollConstr, constructObjects, ICollConstr } from './CollConstr';


export const ViewElement = types
.model('ViewElement', {
  //'@id': types.identifier, // JSON-LD object id of a view
  //'@type': types.string, // JSON-LD class id of a View
  title: types.maybe(types.string),
  description: types.maybe(types.string),

  type: types.string,
  scope: types.maybe(types.string),
  resultsScope: types.maybe(types.string),
  options: types.maybe(types.frozen<JsObject>()),

  // Container-specific (e.g. Layout, type: 'xxxLayout')
  elements: types.maybe(types.array(types.late((): IAnyModelType => ViewElement))),
});


/**
 * Persistable in DB View Description
 */
export const ViewDescr = types
.model('ViewDescr', {
  '@id': types.identifier, // JSON-LD object id of a view
  '@type': types.string, // JSON-LD class id of a View
  //'viewKind': types.string,

  title: types.string, // mandatory title
  description: types.maybe(types.string),

  type: types.string,
  scope: types.maybe(types.string),
  resultsScope: types.maybe(types.string),
  options: types.maybe(types.frozen<JsObject>()),

  // Container-specific (e.g. Layout, type: 'xxxLayout')
  elements: types.array(ViewElement),

  collsConstrs: types.array(CollConstr), // former 'queries'
})
.actions(self => {
  return {
    afterAttach() {
      /*when(
        () => self.collsConstrs.length > 0,
        () => {
          reaction(
            () => getSnapshot(self.collsConstrs),
            (cc, ccOld, react) => {
              console.log("reaction:", cc, ccOld);
            },
            { fireImmediately: true }
          );
        }
      );*/
      
      /*reaction(
        () => getSnapshot(self.collsConstrs),
        (cc, ccOld, react) => {
          console.log("reaction:", cc, ccOld);
        },
        {
          fireImmediately: true,
        }
      );*/
      /*autorun(() => {
        const cc = getSnapshot(self.collsConstrs);
        console.log("autorun:", cc)
      });*/
    },
    setCollConstrs(collsConstrs: any[]) {
      //applySnapshot(self.collsConstrs, collsConstrs);
      const ccso = collsConstrs.map((cc) => CollConstr.create(cc));
      self.collsConstrs.push(...ccso);
    }
  };
});

export interface IViewDescrSnapshotIn extends SnapshotIn<typeof ViewDescr> {}


export const View = types
.model('View', {
  '@id': types.identifier, // JSON-LD object id of a view
  viewDescr: ViewDescr,
  colls: types.map(Coll),
  //editingData: types.map(types.boolean),
})
/**
 * Actions
 */
.actions((self) => {
  const repository: IAnyStateTreeNode = getRoot(self);
  let disps: JsObject = {};
  return {
    loadColl: flow(function* loadColl(collConstr: JsObject) {
      const iri = collConstr['@id'];
      let coll = self.colls.get(iri);
      if (!coll) {
        coll = self.colls.put({
          '@id': iri,
        });
        //coll = self.colls.get(iri);
      }
      if (coll)
        yield coll.loadColl(collConstr);
      return coll;
    }),

    deleteColl(collConstr: JsObject) {
      const iri = collConstr['@id'];
      return self.colls.delete(iri);
    },

    afterAttach() {
      when(
        () => self.viewDescr.collsConstrs.length > 0 /*&& repository.ns && repository.ns.current && repository.ns.current.size > 4*/,
        () => {
          reaction(
            //() => getSnapshot(self.viewDescr.collsConstrs),
            () => self.viewDescr.collsConstrs,
            (ccs: ICollConstr[], ccsOld: ICollConstr[]) => {
              //console.log("reaction:", ccs, ccsOld);
              if (!ccsOld) ccsOld = [];
              if (!ccs) ccs = [];
              const delCcs = ccsOld.filter(cc => !ccs.includes(cc));
              const newCcs = ccs.filter(cc => !ccsOld.includes(cc));
              delCcs.forEach((cc) => {
                const disp: any = disps[cc['@id']];
                if (disp) {
                  disp();
                  delete disps[cc['@id']];
                }
                this.deleteColl(cc);
              });
              const dispsNew = newCcs.map((cc) => {
                const disp = reaction(
                  () => getSnapshot(cc),
                  (ccs, ccsOld) => {
                    this.loadColl(ccs);
                    //console.log('react2-ok');
                  },
                  { fireImmediately: true }
                );
                return {
                  '@id': cc['@id'],
                  disp,
                };
              });
              disps = {
                ...disps,
                ...dispsNew,
              };
              //console.log('react1-ok');
            },
            { fireImmediately: true }
          );
        }
      );
    },
  }
});
export interface IView extends Instance<typeof View> {};


export const Views = types
.model('Views', {
  views: types.map(View),
})
.actions((self) => {
  return {
    createView(viewDescr: IViewDescrSnapshotIn) {
      if(self.views.has(viewDescr['@id'])) {
        self.views.delete(viewDescr['@id']);
      }
      const view = View.create({
        '@id': viewDescr['@id'],
        viewDescr,
      });
      //self.views.put(view);
      return self.views.put(view);//self.views.get(viewDescr['@id']) as IView;
    },
    setViewClass() {
      ;
    },
  };
});
