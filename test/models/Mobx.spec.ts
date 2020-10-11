//import { getSnapshot } from 'mobx-state-tree';
import { triple, variable, namedNode } from '@rdfjs/data-model';

import { rootStore } from '../../src/models/model';
import { idComparator, Query } from '../../src/ObjectProvider';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from '../config';
import { vocabsFiles, shapesFiles, rootFolder, usersFiles, projectsFoldersFiles } from '../configTests';

import { ResourceSchema, ClassSchema } from '../../src/schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../../src/schema/ArtifactShapeSchema';
import { artifactShapeNoProperty, artifactShapeProperty } from '../schema/TestSchemas';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

test('mobx model initial state', () => {
  expect(rootStore.server.repository.repositoryUrl).toBe('/repositories/');
  expect(rootStore.server.repository.statementsUrl).toBe('/repositories//statements');
});

test('mobx model mutate state', () => {
  rootStore.server.repository.setId('rep1');
  expect(rootStore.server.repository.repositoryUrl).toBe('/repositories/rep1');
  expect(rootStore.server.repository.statementsUrl).toBe('/repositories/rep1/statements');

  rootStore.server.setURL('http://server.com');
  expect(rootStore.server.repository.repositoryUrl).toBe('http://server.com/repositories/rep1');
  expect(rootStore.server.repository.statementsUrl).toBe('http://server.com/repositories/rep1/statements');
});

let rmRepositoryID: string;

const query: Query = {
  '@id': 'rm:ModuleViewClass_Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  '@type': 'rm:Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  shapes: [
    {
      '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: 'rmUserTypes:UsedInModule', // it could be schema object or class IRI string
      //schema: usedInModuleSchema,
      conditions: {
        // key-value JsObject
        // pay attention to the collisions with '@id', '@type' and other JSON-LD props!
        // it should be screened like '@_id', '@_type'
        '@id': 'rmUserTypes:my_link', // IRI of an element, but should be ID of condition object itself ('@id': 'rm:UsedInModuleLink_Shape0_Condition')
        '@type': 'some conditions type', // normally gets from schema @id
        //'@_id':
        //'@_type':
        object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
        subject: '?eIri1',
      },
      //variables: {},
    },
    {
      '@id': 'rm:LinketArtifact_Shape1', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        //$id: 'rm:Artifact',
        '@id': 'rm:Artifact',
        '@type': 'rm:Artifact',
        title: 'Требование',
        description: 'Тип ресурса',
        type: 'object',
        '@context': {
          '@type': 'rdf:type',
          identifier: 'dcterms:identifier',
          title: 'dcterms:title',
          description: 'dcterms:description',
          creator: {
            '@id': 'dcterms:creator',
            '@type': 'pporoles:User',
          },
          created: 'dcterms:created',
          modifiedBy: {
            '@id': 'oslc:modifiedBy',
            '@type': 'pporoles:User',
          },
          modified: 'dcterms:modified',
          processArea: {
            '@id': 'nav:processArea',
            '@type': 'nav:ProjectArea',
          },
          assetFolder: {
            '@id': 'rm:assetFolder',
            '@type': 'nav:folder',
          },
          artifactFormat: {
            '@id': 'rm:artifactFormat',
            '@type': 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow',
          },
        },
        properties: {
          '@id': {
            title: 'URI',
            type: 'string',
            format: 'iri',
          },
          '@type': {
            title: 'Тип',
            type: 'string',
            format: 'iri',
          },
          identifier: {
            title: 'Идентификатор',
            description: 'Числовой идентификатор требования, уникальный только в пределах этой системы',
            type: 'integer',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          title: {
            title: 'Название',
            description: 'Краткое название требования',
            type: 'string',
            shapeModifiability: 'system',
            //valueModifiability: 'user',
          },
          description: {
            title: 'Описание',
            description: 'Информация о требовании',
            type: 'string',
            shapeModifiability: 'system',
            //valueModifiability: 'user',
          },
          creator: {
            title: 'Кем создан',
            description: 'Пользователь, создавший требование',
            type: 'string',
            format: 'iri',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          created: {
            title: 'Когда создан',
            description: 'Когда требование было создано',
            type: 'string',
            format: 'date-time',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          modifiedBy: {
            title: 'Кем изменен',
            description: 'Пользователь, изменивший требование',
            type: 'string',
            format: 'iri',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          modified: {
            title: 'Когда изменен',
            description: 'Когда требование было изменено',
            type: 'string',
            format: 'date-time',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          processArea: {
            title: 'Проект',
            description: 'Связано с проектной областью',
            type: 'string',
            format: 'iri',
            shapeModifiability: 'system',
            //valueModifiability: 'system',
          },
          assetFolder: {
            title: 'Папка',
            description: 'Папка, содержащая требования',
            type: 'string',
            format: 'iri',
            shapeModifiability: 'system',
            //valueModifiability: 'user',
          },
          artifactFormat: {
            title: 'Формат',
            description: 'Формат заполнения/отображения',
            type: 'string',
            format: 'iri',
            shapeModifiability: 'system',
            //valueModifiability: 'user',
          },
          hasChild: {
            title: 'Имеет потомков',
            description: 'Имеет потомков',
            type: 'boolean',
            shapeModifiability: 'system',
          },
        },
        required: ['@id', '@type', 'title', 'hasChild' /*, 'identifier', 'assetFolder', 'artifactFormat'*/],
      }, // it could be schema object or class IRI string
      // key-value {}:JsObject
      conditions: {
        // context-less property calculated by EXISTS function
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              triple(
                variable('eIri2'),
                namedNode('http://cpgu.kbpm.ru/ns/rm/user-types#parentBinding'),
                variable('eIri1'),
              ),
            ],
          },
        },
      },
      //variables: {},
    },
    /*{
      '@id': 'rm:Artifact_Shape1', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: 'rm:Artifact',
    },
    {
      '@id': 'rm:ClassLess_Shape2', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: {
        '@id': 'rm:UsedInModuleHasChild',
        properties: {
          // context-less required property!!!
          hasChild: {
            title: 'Имеет потомков',
            description: 'Имеет потомков',
            type: 'boolean',
            shapeModifiability: 'system',
          },
        },
        required: ['hasChild'],
      },
      conditions: {
        // context-less property calculated by EXISTS function
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              triple(
                variable('eIri2'),
                namedNode('http://cpgu.kbpm.ru/ns/rm/user-types#parentBinding'),
                variable('eIri1'),
              ),
            ],
          },
        },
      },
    },*/
  ],
  orderBy: 'bookOrder',
  limit: 10,
};

describe('mobx create repository', () => {
  it(`should persist artifact in the store`, async () => {
    try {
      rootStore.server.setURL(rdfServerUrl);

      rmRepositoryID = 'test_MobxCreateRepository' + Date.now();
      await rootStore.server.repository.createRepository(
        {
          ...rmRepositoryParam,
          'Repository ID': rmRepositoryID,
        },
        rmRepositoryType,
      );

      const files = vocabsFiles.concat(shapesFiles, usersFiles, projectsFoldersFiles);
      //console.log('uploadFiles ', files);
      rootStore.server.repository.setId(rmRepositoryID);
      await rootStore.server.repository.uploadFiles(files, rootFolder);
      //await sleep(5000); // give RDF classifier some time to classify resources after upload
    } catch (err) {
      fail(err);
    }

    const repository = rootStore.server.repository;

    //console.log('Create ObjectProviderImpl');
    //this.client = client;
    repository.schemas.addSchema(ResourceSchema);
    repository.schemas.addSchema(ClassSchema);
    //repository.schemas.addSchema(DataTypeSchema);
    repository.schemas.addSchema(ArtifactShapeSchema);
    repository.schemas.addSchema(PropertyShapeSchema);

    expect(repository.queryPrefixes.current.size).toBe(3);
    await repository.queryPrefixes.reloadQueryPrefixes();
    //console.log(getSnapshot(repository.queryPrefixes.current));
    expect(repository.queryPrefixes.current.size).toBeGreaterThan(3);

    const artifactShapeSchema1 = await repository.selectObjects(ArtifactShapeSchema, {
      targetClass: 'rm:Artifact',
    });
    const artifactShapeSchema11 = await repository.selectObjects(ArtifactShapeSchema, {
      targetClass: 'rm:Artifact',
    });
    expect(artifactShapeSchema1).toHaveLength(1);
    expect(artifactShapeSchema1[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
    expect(artifactShapeSchema1[0].property.sort(idComparator)).toEqual(
      expect.arrayContaining(artifactShapeProperty.sort(idComparator)),
    );
    expect(artifactShapeSchema11).toHaveLength(1);
    expect(artifactShapeSchema11[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
    expect(artifactShapeSchema11[0].property).toEqual(expect.arrayContaining(artifactShapeProperty));

    const linksAndArtifacts = await repository.selectObjectsByQuery(query);
    expect(linksAndArtifacts.length).toBe(10);
    /*expect(linksAndArtifacts[0]).toMatchObject({
      '@id': 'reqs:_M1HusThYEem2Z_XixsC3pQ',
      '@type': ['rmUserTypes:UsedInModule', 'rm:Artifact'],
      object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      subject: 'cpgu:///_tHAikozUEeOiy8owVBW5pQ',
      parentBinding: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      depth: 1,
      bookOrder: 1,
      '@id1': 'cpgu:///_tHAikozUEeOiy8owVBW5pQ',
      identifier: 30001,
      title: 'ТН ВЭД ТС',
      creator: 'users:amivanoff',
      created: '2014-02-10T10:12:16.000Z',
      modifiedBy: 'users:amivanoff',
      modified: '2014-02-10T10:12:16.000Z',
      processArea: 'projects:gishbbProject',
      assetFolder: 'folders:samples_module',
      artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      hasChild: true,
    });*/
  });
});
