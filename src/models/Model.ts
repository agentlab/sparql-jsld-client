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
import { when } from 'mobx';

import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';
import { JsObject } from '../ObjectProvider';
import { SparqlClient } from '../SparqlClient';

import { MstRepository } from './MstRepository';

export const rootModelInitialState: any = {
  repId: '',
  user: {
    //'@id': 'mailto:guest@example.com',//<mailto:guest@example.com>
    login: 'guest@example.com',
    name: 'Guest',
  },
  processArea: 'projects:gishbbProject',
  ns: {
    current: {
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      sesame: 'http://www.openrdf.org/schema/sesame#',
      aldkg: 'https://agentlab.ru/ldkg/onto#',
    },
  },
  schemas: {
    json: {
      [ResourceSchema['@id']]: ResourceSchema,
      [ClassSchema['@id']]: ClassSchema,
      //[DataTypeSchema['@id']]: DataTypeSchema,
      [ArtifactShapeSchema['@id']]: ArtifactShapeSchema,
      [PropertyShapeSchema['@id']]: PropertyShapeSchema,
    },
    class2schema: {
      [ResourceSchema.targetClass]: ResourceSchema['@id'],
      [ClassSchema.targetClass]: ClassSchema['@id'],
      //[DataTypeSchema.targetClass]: DataTypeSchema['@id'],
      [ArtifactShapeSchema.targetClass]: ArtifactShapeSchema['@id'],
      [PropertyShapeSchema.targetClass]: PropertyShapeSchema['@id'],
    },
  },
  //collsConstr: {},
  colls: {},
};

/*onSnapshot(rootStore, (snapshot) => {
  console.debug('Snapshot: ', snapshot);
  localStorage.setItem('rootState', JSON.stringify(snapshot));
});

onPatch(rootStore, (snapshot) => {
  console.debug('Snapshot Patch: ', snapshot);
});*/

/**
 * Collections Configs
 */
export interface CollState {
  constr: any;
  data: JsObject[];
  opt?: JsObject;
}

/**
 * Adds new Coll with CollConstr and dataIntrnl to the model
 * If CollConstr with '@id' existed, adds data to the Coll's dataIntrnl
 * @param repId
 * @param client
 * @param initialState
 * @param additionalColls
 * @returns
 */
export const createModelFromState = (
  repId: string,
  client: SparqlClient,
  initialState: any,
  additionalColls: CollState[] | undefined = undefined,
): any => {
  //@ts-ignore
  const model = MstRepository.create(initialState, { client });
  model.setId(repId);
  model.ns.reloadNs();
  if (additionalColls && additionalColls.length > 0) {
    // wait until namespaces loads then add additionalState
    when(
      () => Object.keys(model.ns.currentJs).length > 5,
      () => {
        additionalColls.forEach((collState) => {
          let existedColl;
          // Add new Coll with CollConstr and dataIntrnl to the model
          if (typeof collState.constr === 'object') {
            existedColl = model.getColl(collState.constr['@id']);
            if (existedColl === undefined) {
              try {
                const coll = model.addColl(collState.constr, collState.opt, collState.data);
                if (!coll) {
                  console.warn(`Warn: Coll insertion failed! Coll ${collState.constr['@id']} is undefined`);
                }
              } catch (err) {
                console.error(`Err: Coll insertion failed! Coll ${collState.constr['@id']} is undefined`);
                console.error(err);
              }
            }
          } else if (typeof collState.constr === 'string') {
            existedColl = model.getColl(collState.constr);
            if (existedColl === undefined) {
              try {
                const coll = model.addCollByConstrRef(collState.constr, collState.opt, collState.data);
                if (!coll) {
                  console.warn(`Warn: Coll insertion failed! Coll ${collState.constr} is undefined`);
                }
              } catch (err) {
                console.error(`Err: Coll insertion failed! Coll ${collState.constr} is undefined`);
                console.error(err);
              }
            }
          }
          // If CollConstr with '@id' existed, adds data to the Coll's dataIntrnl
          if (existedColl !== undefined && collState.data && isArray(collState.data)) {
            existedColl.addElems(collState.data);
          }
        });
      },
    );
  }
  return model;
};
