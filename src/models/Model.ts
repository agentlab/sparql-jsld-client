/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { when } from 'mobx';

import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';
import { JsObject } from '../ObjectProvider';
import { SparqlClient } from '../SparqlClient';

import { MstRepository, TMstRepositorySnapshotIn } from './MstRepository';

export const rootModelInitialState: TMstRepositorySnapshotIn = {
  repId: '',
  user: {
    login: 'guest@acme.com',
    name: 'Guest',
  },
  ns: {
    current: {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      owl: 'http://www.w3.org/2002/07/owl#',
      // shapes
      sh: 'http://www.w3.org/ns/shacl#',
      dash: 'http://datashapes.org/dash#',
      // rdf4j-specific
      sesame: 'http://www.openrdf.org/schema/sesame#', //rdf4j DirectType Inferencer sesame:directSubClassOf
      rdf4j: 'http://rdf4j.org/schema/rdf4j#', //rdf4j Default Graph rdf4j:nil, rdf4j:SHACLShapeGraph
      // library constant IRIs
      aldkg: 'https://agentlab.eu/ns/ldkg#',
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
          if (existedColl !== undefined && collState.data && Array.isArray(collState.data)) {
            existedColl.addElems(collState.data);
          }
        });
      },
    );
  }
  return model;
};
