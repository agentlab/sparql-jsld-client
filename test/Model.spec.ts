/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { triple, variable, namedNode } from '@rdfjs/data-model';
import moment from 'moment';
import { reaction, values, when } from 'mobx';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';

import { JSONSchema6forRdf } from '../src/ObjectProvider';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { rootModelInitialState } from '../src/models/Model';
import { Repository } from '../src/models/Repository';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { ViewShapeSchema } from './schema/TestSchemas';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../src/schema/ArtifactShapeSchema';

jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);

const repository = Repository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

export function genTimestampedName(name: string): string {
  return  name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_UiModel');
  console.log(rmRepositoryID);
  try {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.uploadFiles(usersFiles, rootFolder);
    await client.uploadFiles(projectsFoldersFiles, rootFolder);
    await client.uploadFiles(shapesFiles, rootFolder);
    await client.uploadFiles(samplesFiles, rootFolder);
    //await sleep(5000); // give RDF classifier some time to classify resources after upload

    await repository.ns.reloadNs();
  } catch (err) {
    fail(err);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err) {
    fail(err);
  }
});

const collsConstrs: any[] = [
  {
    // globally unique ID of this Query object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
    '@id': 'rm:ProjectView_Artifacts_CollConstr',
    '@type': 'rm:CollConstr',
    entConstrs: [
      {
        // globally unique ID of this Shape object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
        '@id': 'rm:ProjectView_Artifacts_CollConstr_Ent0',
        //'@type': 'rm:CollConstrShape',
        // JSON Schema (often same as Class IRI), required!
        // it could be schema object or class IRI string
        schema: 'rm:ArtifactShape',
        // key-value {}:JsObject, could be omitted
        conditions: {
          // globally unique ID of this Condition object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
          //'@id': 'rm:ProjectView_Artifacts_CollConstr_Ent0_Condition',
          // globally unique ID of the Class of this condition object, could be used for mobx JSON-LD storage or server storage, not processed by query generator
          //'@type': 'rm:CollConstrCondition',
          //'@_id':
          //'@_type':
          assetFolder: 'folders:samples_collection',
        },
        //variables: {},
        //fields: [], //string[]
      },
    ],
    // could be string or string[]. varname or property IRI?
    // ['?identifier0', 'DESC(?title0)']
    //orderBy: [{ expression: variable('identifier0'), descending: false }], // if last digit not specified, we assuming '0' (identifier0)
    //limit: 50,
  },
  {
    '@id': 'rm:ProjectView_Folders_CollConstr',
    '@type': 'rm:CollConstr',
    entConstrs: [
      {
        '@id': 'rm:ProjectView_Folders_CollConstr_Ent0',
        '@type': 'rm:CollConstr',
        schema: 'nav:folderShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectView_Users_CollConstr',
    '@type': 'rm:CollConstr',
    entConstrs: [
      {
        '@id': 'rm:Users_Ent0',
        '@type': 'rm:EntConstr',
        schema: 'pporoles:UserShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectView_ArtifactClasses_CollConstr',
    '@type': 'rm:CollConstr',
    entConstrs: [
      {
        '@id': 'rm:ProjectView_ArtifactClasses_CollConstr_Ent0',
        '@type': 'rm:EntConstr',
        schema: 'rm:ArtifactClassesShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectView_ArtifactFormats_CollConstr',
    '@type': 'rm:CollConstr',
    entConstrs: [
      {
        '@id': 'rm:ProjectView_ArtifactFormats_CollConstr_Ent0',
        '@type': 'rm:EntConstr',
        schema: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOowShape',
      },
    ],
  },
];

const viewDescr = {
  '@id': 'rm:projectView',
  '@type': 'rm:View',
  //'viewKind': 'rm:ProjectView',
  title: 'Требования проекта',
  description: 'Project View with flat table',
  //collsConstrs: ,
  type: 'VerticalLayout', // мб widget или control вместо type?
  elements: [
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'HorizontalLayout',
          options: {
            justify: 'start', // start end center space-between space-around
            contentSize: true,
            style: {
              flexGrow: '5',
            },
          },
          elements: [
            {
              type: 'TabControl',
              // by this resultsScope TabControl could have read access to the results, selected by Query with @id='rm:ProjectView_ArtifactFormats_CollConstr'
              resultsScope: 'rm:ProjectView_ArtifactFormats_CollConstr', // bind to results data by query @id
              options: {
                title: 'Требования',
                style: {
                  margin: '0 0 0 24px',
                },
                contentSize: true,
                // by this connection TabControl could have read/write access to the property 'artifactFormat' in condition object with @id='rm:ProjectView_Artifacts_CollConstr_Ent0_Condition'
                connections: [
                  {
                    to: 'rm:ProjectView_Artifacts_CollConstr_Ent0_Condition',
                    by: 'artifactFormat',
                  },
                ],
              },
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          options: {
            contentSize: true,
            justify: 'end',
          },
          elements: [
            {
              type: 'Button',
              options: {
                contentSize: true,
                icon: 'sync',
              },
            },
            {
              type: 'MenuControl',
              resultsScope: 'rm:ProjectView_Artifacts_CollConstr',
              options: {
                contentSize: true,
                style: {
                  margin: '0 24px 0 5px',
                },
              },
              elements: [
                {
                  '@id': 'attr-types-and-links-settings',
                  type: 'View',
                  resultsScope: 'rm:dataModelView',
                  options: {
                    height: 'all-empty-space',
                    modal: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'Query',
      scope: 'rm:ProjectView_Artifacts_CollConstr', // bind to json-ld object by '@id'
      options: {
        style: {
          margin: '0 0 0 16px',
        },
      },
    },
    {
      type: 'SplitPaneLayout',
      options: {
        defaultSize: {
          'rm:ProjectView_Folders_CollConstr': '17%',
        },
        height: 'all-empty-space',
      },
      elements: [
        {
          type: 'DataControl',
          resultsScope: 'rm:ProjectView_Folders_CollConstr',
          options: {
            renderType: 'tree',
            connections: [
              {
                //from: 'selector', // inner UI component variable name in case it has several variables? e.g. drag, moveX/moveY, width/height?
                to: 'rm:ProjectView_Artifacts_CollConstr_Ent0_Condition',
                by: 'assetFolder',
              },
            ],
          },
        },
        //{
        //  type: 'infinity-tree',
        //  resultsScope: 'rm:ProjectView_Folders_CollConstr',
        //  options: {
        //    rootId: 'folders:root',
        //    connections: [
        //      {
        //        //from: 'selector', // inner UI component variable name in case it has several variables? e.g. drag, moveX/moveY, width/height?
        //        to: 'rm:ProjectView_Artifacts_CollConstr_Ent0_Condition',
        //        by: 'assetFolder',
        //      },
        //    ],
        //  },
        //},
        {
          '@id': 'ArtifactTable',
          type: 'Array',
          resultsScope: 'rm:ProjectView_Artifacts_CollConstr',
          options: {
            draggable: true,
            resizeableHeader: true,
            order: [
              'identifier',
              'title',
              '@type',
              'artifactFormat',
              'description',
              'xhtmlText',
              'modified',
              'modifiedBy',
              '@id',
              'assetFolder',
            ],
            identifier: {
              width: 140,
              sortable: true,
              formater: 'link',
              editable: false,
              dataToFormater: { link: '@id' },
            },
            title: {
              formater: 'artifactTitle',
              dataToFormater: { type: 'artifactFormat' },
            },
            '@type': {
              width: 140,
              formater: 'dataFormater',
              query: 'rm:ProjectView_ArtifactClasses_CollConstr',
            },
            artifactFormat: {
              formater: 'dataFormater',
              query: 'rm:ProjectView_ArtifactFormats_CollConstr',
            },
            description: {
              //formater: 'tinyMCE',
              sortable: true,
            },
            xhtmlText: {
              formater: 'tinyMCE',
              tinyWidth: 'emptySpace', // emptySpace, content
              width: 300,
            },
            modified: {
              width: 140,
              formater: 'dateTime',
              sortable: true,
            },
            modifiedBy: {
              formater: 'dataFormater',
              query: 'rm:ProjectView_Users_CollConstr',
              key: 'name',
            },
            '@id': {
              width: 220,
            },
            assetFolder: {
              formater: 'dataFormater',
              query: 'rm:ProjectView_Folders_CollConstr',
            },
          },
        },
      ],
    },
  ],
};
const completeViewDescr = {
  ...viewDescr,
  collsConstrs,
};

const viewCollConstr = {
  '@id': 'rm:_as124k_collconstr',
  entConstrs: [
    {
      '@id': 'rm:_as124k_entConstr0',
      schema: ViewShapeSchema,
    }
  ],
};


export const completeViewDescr2 = {
  '@id': 'rm:DataModelView',
  '@type': 'rm:View',
  title: 'Модель данных',
  description: 'Модель данных хранилища на основе SHACL Shapes',
  type: 'VerticalLayout',
  elements: [],
  collsConstrs: [
    {
      '@id': 'rm:NodeShapes_CollConstr',
      '@type': 'rm:CollConstr',
      entConstrs: [
        {
        '@id': 'rm:NodeShapes_EntConstr0',
        '@type': 'rm:EntConstr',
        schema: ArtifactShapeSchema['@id'],
        },
      ],
    },
    {
      '@id': 'rm:PropertyShapes_CollConstr',
      '@type': 'rm:CollConstr',
      entConstrs: [
        {
          '@id': 'rm:PropertyShapes_EntConstr0',
          '@type': 'rm:EntConstr',
          schema: PropertyShapeSchema['@id'],
        },
      ],
    },
  ],
};


describe('UiModel', () => {
  it('UiModel loads all colls initially from collConstrs in ViewDescr', (done) => {
    const coll0 = repository.addColl(viewCollConstr, {updPeriod: undefined}, [completeViewDescr]);
    expect(coll0).not.toBeNull();
    // somewere in the GUI far far away... we'll get coll by it's iri or collConstr object
    const coll = repository.getColl(viewCollConstr['@id']);
    expect(coll).not.toBeNull();
    //const ss = getSnapshot(coll as any);
    expect(coll?.data.length).toBe(1);
    const view: any = coll?.dataByIri('rm:projectView');
    //const ss = getSnapshot(view);
    const viewCollsConstrs = view.collsConstrs;
    expect(viewCollsConstrs.length).toBe(completeViewDescr.collsConstrs.length);
    const collsFromView = viewCollsConstrs.map((vcc: any) => {
      const c = repository.getColl(vcc);
      const client = c?.collConstr?.client;
      return c;
    });
    when(
      () => {
        if (collsFromView.length === completeViewDescr.collsConstrs.length) {
          let r = true;
          collsFromView.forEach((cfv: any) => {
            //const ss = getSnapshot(cfv);
            const data = cfv.data;
            if (r && data.length === 0)
              r = false;
          });
          return r;
        }
        return false;
      },
      () => {
        //let ss: any = getSnapshot(view.viewDescr.collsConstrs);
        //console.log(ss);
        //ss = getSnapshot(view.colls);
        //console.log(ss);
        done();
      }
    );
  });

  it('UiModel loads all colls in ViewDescr', (done) => {
    const coll0 = repository.addColl(viewCollConstr, {updPeriod: undefined, lastSynced: moment.now()}, [completeViewDescr2]);
    expect(coll0).not.toBeNull();
    // somewere in the GUI far far away... we'll get coll by it's iri or collConstr object
    const coll = repository.getColl(viewCollConstr['@id']);
    //expect(coll).not.toBeNull();
    //const ss = getSnapshot(coll as any);
    //expect(coll?.data.length).toBe(1);
    const view: any = coll?.dataByIri('rm:DataModelView');
    when(
      () => {
          let r = true;
          completeViewDescr2.collsConstrs.forEach((vcc: any) => {
            const colls = repository.colls;
            const collsSS = getSnapshot(colls);
            const cfv = colls.get(vcc['@id']);
            const data = cfv?.dataJs;
            if (r && (!data || data.length === 0))
              r = false;
          });
          return r;
      },
      () => {
        done();
      }
    );
  });

  /*it('UiModel loads all colls from collConstrs added to ViewDescr', (done) => {
    const view = repository.createView(viewDescr);
    when(
      //() => view.viewDescr.collsConstrs.length > 0,
      () => {
        if (view.colls.size === collsConstrs.length) {
          const v = values(view.colls).find((c: any) => !c.data || c.data.length === 0);
          const r = !v;
          const ss = getSnapshot(view.colls);
          return r;
        }
        return false;
      },
      () => {
        //console.log(getSnapshot(view.viewDescr.collsConstrs));
        const ss = getSnapshot(view.colls);
        console.log(ss);
        done();
      }
    );
    view.viewDescr.setCollConstrs(collsConstrs);
    //console.log(getSnapshot(view));
  });

  //TODO: UiModel loads additional colls / delete colls test

  it('UiModel reload colls from changed ViewDescr collConstrs', (done) => {
    const view = repository.createView(viewDescr);
    const whenDisp1 = when(
      () => {
        if (view.colls.size === collsConstrs.length) {
          const v = values(view.colls).find((c: any) => !c.data || c.data.length === 0);
          const r = !v;
          return r;
        }
        return false;
      },
      () => {
        whenDisp1();
        //console.log(getSnapshot(view.viewDescr.collsConstrs));
        const ss = getSnapshot(view.colls);
        console.log(ss);
        const coll = view.colls.get(collsConstrs[0]['@id']);
        if (coll) {
          const whenDisp2 = when(
            () => {
              if (view.colls.size === collsConstrs.length) {
                const r = coll.data.length === 0;
                return r;
              }
              return false;
            },
            () => {
              whenDisp2();
              //console.log(getSnapshot(view.viewDescr.collsConstrs));
              const ss = getSnapshot(view.colls);
              console.log(ss);
              let cc = view.viewDescr.collsConstrs[0].entConstrs[0].conditionsJs;
              console.log(cc);
              done();
            }
          );
          let cond = view.viewDescr.collsConstrs[0].entConstrs[0].conditionsJs;
          cond = {
            ...cond,
            assetFolder: 'folders:root',
          };
          applySnapshot(view.viewDescr.collsConstrs[0].entConstrs[0].conditions, cond);
          const cc = view.viewDescr.collsConstrs[0].entConstrs[0].conditions;
          console.log(getSnapshot(cc));
        }
      }
    );
    view.viewDescr.setCollConstrs(collsConstrs);
  });*/
});
