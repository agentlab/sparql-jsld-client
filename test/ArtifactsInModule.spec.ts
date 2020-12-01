import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { rootStore } from '../src/models/model';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { Query } from '../src/ObjectProvider';
import { usedInModuleSchema, usedInSchema } from './schema/TestSchemas';
import { triple, variable, namedNode } from '@rdfjs/data-model';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_ArtifactsInModule');
  try {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles(vocabsFiles, rootFolder);
    await repository.uploadFiles(usersFiles, rootFolder);
    await repository.uploadFiles(projectsFoldersFiles, rootFolder);
    await repository.uploadFiles(shapesFiles, rootFolder);
    await repository.uploadFiles(samplesFiles, rootFolder);
    //await sleep(5000); // give RDF classifier some time to classify resources after upload

    await repository.queryPrefixes.reloadQueryPrefixes();
  } catch (err) {
    fail(err);
  }
});

afterAll(async () => {
  try {
    await repository.deleteRepository(rmRepositoryID);
  } catch (err) {
    fail(err);
  }
});

const query: any = {
  '@id': 'rm:ModuleViewClass_Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  '@type': 'rm:Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  shapes: [
    {
      '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: 'rmUserTypes:UsedInModuleShape', // it could be schema object or class IRI string
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
        '@id': 'rm:ArtifactInUsedInModuleLink',
        '@type': 'sh:NodeShape',
        title: 'Требование',
        description: 'Тип ресурса',
        targetClass: 'rm:Artifact',
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
  orderBy: [{
    expression: variable('bookOrder0'),
    descending: false,
  }],
  limit: 10,
};

describe('ArtifactsInModules query should return Module UsedInModules with associated Artifact', () => {
  it('sorted by bookOrder', async () => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const linksAndArtifacts = await repository.selectObjects(query);
    expect(linksAndArtifacts.length).toBe(10);
    expect(linksAndArtifacts[0]).toMatchObject({
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
    });
  });

  it('sorted by ASC bookOrder', async () => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const linksAndArtifacts = await repository.selectObjects({
      ...query,
      orderBy: [{
        expression: variable('bookOrder0'),
        descending: false,
      }],
    });
    expect(linksAndArtifacts.length).toBe(10);
    expect(linksAndArtifacts[0]).toMatchObject({
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
    });
  });

  it('sorted by DESC bookOrder', async () => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const linksAndArtifacts = await repository.selectObjects({
      ...query,
      orderBy: [{
        expression: variable('bookOrder0'),
        descending: true,
      }],
    });
    expect(linksAndArtifacts.length).toBe(10);
    expect(linksAndArtifacts[0]).toMatchObject({
      '@id': 'reqs:_N1HusThYEem2Z_XixsC3pQ',
      '@type': ['rmUserTypes:UsedInModule', 'rm:Artifact'],
      object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      subject: 'cpgu:///_Ep8ocYzVEeOiy8owVBW5pQ',
      parentBinding: 'cpgu:///_zYXy8ozUEeOiy8owVBW5pQ',
      depth: 3,
      bookOrder: 10,
      '@id1': 'cpgu:///_Ep8ocYzVEeOiy8owVBW5pQ',
      identifier: 30010,
      title: 'Наименование товарной позиции',
      creator: 'users:amivanoff',
      created: '2014-02-10T10:12:16.000Z',
      modifiedBy: 'users:amivanoff',
      modified: '2014-02-10T10:12:16.000Z',
      processArea: 'projects:gishbbProject',
      assetFolder: 'folders:samples_module',
      artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      hasChild: false,
    });
  });

  it('sorted by two: ASC bookOrder and DESC depth', async () => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const linksAndArtifacts = await repository.selectObjects({
      ...query,
      orderBy: [
        {
          expression: variable('depth0'),
          descending: true,
        },
        {
          expression: variable('bookOrder0'),
          descending: false,
        }
      ],
    });
    expect(linksAndArtifacts.length).toBe(10);
    expect(linksAndArtifacts[0]).toMatchObject({
      depth: 6,
      bookOrder: 6,
      hasChild: false,
    });
    expect(linksAndArtifacts[1]).toMatchObject({
      depth: 6,
      bookOrder: 7,
      hasChild: false,
    });
  });
});
