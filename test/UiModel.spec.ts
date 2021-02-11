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
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import moment from 'moment';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { UiModel, uiModelInitialState } from '../src/models/UiModel';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { values, when } from 'mobx';

jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = UiModel.create(uiModelInitialState, { client });
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
    '@id': 'rm:ProjectViewClass_Artifacts_Query',
    '@type': 'rm:Query',
    entConstrs: [
      {
        // globally unique ID of this Shape object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
        '@id': 'rm:ProjectViewClass_Artifacts_Query_Shape0',
        //'@type': 'rm:QueryShape',
        // JSON Schema (often same as Class IRI), required!
        // it could be schema object or class IRI string
        schema: 'rm:ArtifactShape',
        // key-value {}:JsObject, could be omitted
        conditions: {
          // globally unique ID of this Condition object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
          //'@id': 'rm:ProjectViewClass_Artifacts_Query_Shape0_Condition',
          // globally unique ID of the Class of this condition object, could be used for mobx JSON-LD storage or server storage, not processed by query generator
          //'@type': 'rm:QueryCondition',
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
    '@id': 'rm:ProjectViewClass_Folders_Query',
    '@type': 'rm:Query',
    entConstrs: [
      {
        '@id': 'rm:ProjectViewClass_Folders_Query_Shape0',
        '@type': 'rm:QueryShape',
        schema: 'nav:folderShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectViewClass_Users_Query',
    '@type': 'rm:Query',
    entConstrs: [
      {
        '@id': 'rm:Users_Shape0',
        '@type': 'rm:QueryShape',
        schema: 'pporoles:UserShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectViewClass_ArtifactClasses_Query',
    '@type': 'rm:Query',
    entConstrs: [
      {
        '@id': 'rm:ProjectViewClass_ArtifactClasses_Query_Shape0',
        '@type': 'rm:QueryShape',
        schema: 'rm:ArtifactClassesShape',
      },
    ],
  },
  {
    '@id': 'rm:ProjectViewClass_ArtifactFormats_Query',
    '@type': 'rm:Query',
    entConstrs: [
      {
        '@id': 'rm:ProjectViewClass_ArtifactFormats_Query_Shape0',
        '@type': 'rm:QueryShape',
        schema: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOowShape',
      },
    ],
  },
];

const viewDescr = {
  '@id': 'rm:projectView',
  '@type': 'rm:ProjectViewClass',
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
              // by this resultsScope TabControl could have read access to the results, selected by Query with @id='rm:ProjectViewClass_ArtifactFormats_Query'
              resultsScope: 'rm:ProjectViewClass_ArtifactFormats_Query', // bind to results data by query @id
              options: {
                title: 'Требования',
                style: {
                  margin: '0 0 0 24px',
                },
                contentSize: true,
                // by this connection TabControl could have read/write access to the property 'artifactFormat' in condition object with @id='rm:ProjectViewClass_Artifacts_Query_Shape0_Condition'
                connections: [
                  {
                    to: 'rm:ProjectViewClass_Artifacts_Query_Shape0_Condition',
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
              resultsScope: 'rm:ProjectViewClass_Artifacts_Query',
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
      scope: 'rm:ProjectViewClass_Artifacts_Query', // bind to json-ld object by '@id'
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
          'rm:ProjectViewClass_Folders_Query': '17%',
        },
        height: 'all-empty-space',
      },
      elements: [
        {
          type: 'DataControl',
          resultsScope: 'rm:ProjectViewClass_Folders_Query',
          options: {
            renderType: 'tree',
            connections: [
              {
                //from: 'selector', // inner UI component variable name in case it has several variables? e.g. drag, moveX/moveY, width/height?
                to: 'rm:ProjectViewClass_Artifacts_Query_Shape0_Condition',
                by: 'assetFolder',
              },
            ],
          },
        },
        //{
        //  type: 'infinity-tree',
        //  resultsScope: 'rm:ProjectViewClass_Folders_Query',
        //  options: {
        //    rootId: 'folders:root',
        //    connections: [
        //      {
        //        //from: 'selector', // inner UI component variable name in case it has several variables? e.g. drag, moveX/moveY, width/height?
        //        to: 'rm:ProjectViewClass_Artifacts_Query_Shape0_Condition',
        //        by: 'assetFolder',
        //      },
        //    ],
        //  },
        //},
        {
          '@id': 'ArtifactTable',
          type: 'Array',
          resultsScope: 'rm:ProjectViewClass_Artifacts_Query',
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
              query: 'rm:ProjectViewClass_ArtifactClasses_Query',
            },
            artifactFormat: {
              formater: 'dataFormater',
              query: 'rm:ProjectViewClass_ArtifactFormats_Query',
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
              query: 'rm:ProjectViewClass_Users_Query',
              key: 'name',
            },
            '@id': {
              width: 220,
            },
            assetFolder: {
              formater: 'dataFormater',
              query: 'rm:ProjectViewClass_Folders_Query',
            },
          },
        },
      ],
    },
  ],
};

describe('UiModel', () => {
  it('UiModel loads all colls from ViewDescr', (done) => {
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
  });
});
