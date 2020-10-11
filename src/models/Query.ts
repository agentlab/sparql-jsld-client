import { getParentOfType, getSnapshot, Instance, types } from 'mobx-state-tree';
import { NamedNode, Quad, Quad_Subject, Term, Variable } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
import { Generator, SelectQuery, VariableTerm } from 'sparqljs';

import {
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
  JsObject,
  JSONSchema6forRdf,
} from '../ObjectProvider';
import { Repository } from './Repository';
import { IJSONSchema7forRdf, JSONSchema7forRdf } from './Schemas';
import { addprops2vars2props, addToResult, getSchemaPropUri, propsToSparqlVars } from '../SparqlGen';

export const JsObject2 = types.map(types.frozen<any>());
//export interface IJsObject2 extends Instance<typeof JsObject2> {}

export const QueryShape2 = types
  .model('QueryShape2', {
    '@id': types.identifier,
    '@type': types.maybe(types.string),
    // could be class IRI, resolved from local schema reposiory (local cache) or from server
    schema: types.reference(types.late(() => JSONSchema7forRdf)), //types.union(types.string, types.frozen<JSONSchema6forRdf>()),
    conditions: types.optional(JsObject2, {}),
    variables: types.optional(JsObject2, {}),
    data: types.optional(JsObject2, {}),
  })
  .views((self) => ({
    get schemaJs() {
      return getSnapshot(self.schema);
    },
    get conditionsJs() {
      return getSnapshot(self.conditions);
    },
    get variablesJs() {
      return getSnapshot(self.variables);
    },
    get dataJs() {
      return getSnapshot(self.data);
    },
  }));
export interface IQueryShape2 extends Instance<typeof QueryShape2> {
  schema: IJSONSchema7forRdf;
}

const gen = new Generator();
const xsd = 'http://www.w3.org/2001/XMLSchema#';

export interface SparqlShapeInternal2 {
  // internal properties, created and changed within SPARQL generation
  subj: NamedNode | Variable;
  props2vars: { [s: string]: string };
  vars2props: { [s: string]: string };
  query: { [s: string]: any }; // partial query (variables and conditions)
}

export const Query2 = types
  .model('Query2', {
    '@id': types.identifier,
    '@type': types.union(types.string, types.undefined),
    // properties could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
    shapes: types.array(QueryShape2),
    // if last digit not specified, we assuming '0' (identifier0)
    orderBy: types.union(types.string, types.array(types.string), types.undefined),
    limit: types.union(types.number, types.undefined),
    offset: types.union(types.number, types.undefined),
  })

  /**
   * Views
   */
  .views((self) => {
    const queryPrefixes = getParentOfType(self, Repository).queryPrefixes;

    return {
      /**
       *
       * @param uri
       * @param varName
       */
      genShapeSparqlSubject(uri: string | undefined, varName: string): NamedNode | Variable {
        if (uri === undefined) {
          return variable(varName);
        }
        return queryPrefixes.getFullIriNamedNode(uri);
      },
      /**
       * generate unique variable name for element iri & check for uniquiness
       * @param varPref '
       * @param no
       */
      genUniqueVarName(varPref: string, no: number): string {
        let varName = varPref + no;
        self.shapes.forEach((shape) => {
          while (shape.schema.properties && shape.schema.properties.get(varName)) {
            varName += self.shapes.length;
          }
        });
        return varName;
      },

      getWhereVar(shape: SparqlShapeInternal2, schema: any): { bgps: Quad[]; options: Quad[] } {
        const bgps: Quad[] = [];
        const options: Quad[] = [];
        Object.keys(shape.query.variables).forEach((key) => {
          // filter @id, @type,...
          if (!key.startsWith('@')) {
            const propUri = getSchemaPropUri(schema, key);
            const varName = shape.props2vars[key];
            if (propUri && varName) {
              const option = triple(shape.subj, queryPrefixes.getFullIriNamedNode(propUri), variable(varName));
              if (schema.required && schema.required.includes(key)) {
                bgps.push(option);
              } else {
                options.push(option);
              }
            }
          }
        });
        return { bgps, options };
      },

      addToWhere(whereStatements: any[], query: any) {
        if (query) {
          if (query.where) query.where.push(...whereStatements);
          else query.where = whereStatements;
        }
      },

      /**
       *
       * @param schema
       * @param subj
       */
      addToWhereSuperTypesFilter(schema: any, subj: Term, query: any) {
        if (schema && schema.properties) {
          const typeFilter = [
            triple(subj as Variable, queryPrefixes.getFullIriNamedNode('rdf:type'), variable('type0')),
            {
              type: 'filter',
              expression: {
                type: 'operation',
                operator: 'notexists',
                args: [
                  {
                    type: 'group',
                    patterns: [
                      {
                        type: 'bgp',
                        triples: [
                          {
                            subject: variable('subtype0'),
                            predicate: {
                              type: 'path',
                              pathType: '^',
                              items: [namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')],
                            },
                            object: subj,
                          },
                          triple(
                            variable('subtype0'),
                            namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
                            variable('type0'),
                          ),
                        ],
                      },
                      {
                        type: 'filter',
                        expression: {
                          type: 'operation',
                          operator: '!=',
                          args: [variable('subtype0'), variable('type0')],
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              type: 'filter',
              expression: {
                type: 'operation',
                operator: 'exists',
                args: [
                  {
                    type: 'group',
                    patterns: [
                      {
                        type: 'bgp',
                        triples: [
                          {
                            subject: variable('type0'),
                            predicate: {
                              type: 'path',
                              pathType: '*',
                              items: [namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf')],
                            },
                            object: variable('supertype0'),
                          },
                        ],
                      },
                      {
                        type: 'filter',
                        expression: {
                          type: 'operation',
                          operator: '=',
                          args: [variable('supertype0'), queryPrefixes.getFullIriNamedNode(schema['@id'])],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ];
          this.addToWhere(typeFilter, query);
        }
      },

      addToBgpTypeCondition(shape: SparqlShapeInternal2, schema: any) {
        if (schema) {
          const t = triple(
            shape.subj,
            namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            queryPrefixes.getFullIriNamedNode(schema['@id']),
          );
          if (!shape.query.bgps) shape.query.bgps = [t];
          else shape.query.bgps = [t, ...shape.query.bgps];
        }
      },

      getConditionalTriple(property: any, subj: any, value: any, propUri: string): Quad {
        if (property.type === 'string') {
          if (property.format === undefined) {
            value = literal(`${value}`, namedNode(`${xsd}string`));
          } else if (property.format === 'iri') {
            value = queryPrefixes.getFullIriNamedNode(value);
          } else if (property.format === 'date-time') {
            if (typeof value === 'object') {
              value = literal(value.toISOString(), namedNode(`${xsd}dateTime`));
            } else {
              value = literal(`${value}`, namedNode(`${xsd}dateTime`));
            }
          }
        } else if (property.type === 'integer') {
          value = literal(`${value}`, namedNode(`${xsd}integer`));
        } else if (property.type === 'object') {
          if (property.format === 'date-time') {
            if (typeof value === 'object') {
              //value = `"1970-01-01T00:00:00-02:00"^^http://www.w3.org/2001/XMLSchema#dateTime`;
              value = literal(value.toISOString(), namedNode(`${xsd}dateTime`));
            } else {
              value = literal(`${value}`, namedNode(`${xsd}dateTime`));
            }
          } else {
            // IRI
            if (typeof value === 'string') {
              value = queryPrefixes.getFullIriNamedNode(value);
            }
          }
        }
        return triple(subj, queryPrefixes.getFullIriNamedNode(propUri), value);
      },

      getSimpleFilter(schemaProperty: any, filterProperty: any, variable: Variable): any {
        const filter: any = {
          operator: '=',
          type: 'operation',
        };
        if (schemaProperty.type === 'string') {
          if (schemaProperty.format === undefined) {
            filter.args = [variable, literal(`${filterProperty}`)];
          } else if (schemaProperty.format === 'iri') {
            filter.args = [variable, namedNode(`${queryPrefixes.deAbbreviateIri(filterProperty)}`)];
          } else if (schemaProperty.format === 'date-time') {
            if (typeof filterProperty === 'object')
              filter.args = [variable, literal(filterProperty.toISOString(), namedNode(`${xsd}dateTime`))];
            else filter.args = [variable, literal(filterProperty, namedNode(`${xsd}dateTime`))];
          }
        } else if (schemaProperty.type === 'integer') {
          filter.args = [variable, literal(`${filterProperty}`, namedNode(`${xsd}integer`))];
        } else if (schemaProperty.type === 'object') {
          if (schemaProperty.format === 'date-time') {
            if (typeof filterProperty === 'object')
              filter.args = [variable, literal(filterProperty.toISOString(), namedNode(`${xsd}dateTime`))];
            else filter.args = [variable, literal(`${filterProperty}`)];
          } else {
            if (typeof filterProperty === 'string')
              filter.args = [variable, namedNode(`${queryPrefixes.deAbbreviateIri(filterProperty)}`)];
            else filter.args = [variable, literal(`${filterProperty}`)];
          }
        } else filter.args = [variable, literal(`${filterProperty}`)];
        return {
          expression: filter,
          type: 'filter',
        };
      },

      buildEnumFilter(
        filter: any,
        filterKey: Variable,
        filterValues: any[] = [],
        type = 'url',
        concatOperator = '||',
        compareOperator = '=',
      ): any {
        if (filterValues.length === 1) {
          filter.type = 'operation';
          filter.operator = compareOperator;
          if (type === 'integer') {
            filter.args = [filterKey, literal(`${filterValues[0]}`, namedNode(`${xsd}integer`))];
          } else {
            filter.args = [filterKey, queryPrefixes.getFullIriNamedNode(filterValues[0])];
          }
        } else if (filterValues.length > 1) {
          filter.type = 'operation';
          filter.operator = concatOperator;
          filter.args = [
            this.buildEnumFilter(
              {},
              filterKey,
              filterValues.slice(0, filterValues.length - 1),
              type,
              concatOperator,
              compareOperator,
            ),
            this.buildEnumFilter(
              {},
              filterKey,
              filterValues.slice(filterValues.length - 1, filterValues.length),
              type,
              concatOperator,
              compareOperator,
            ),
          ];
        }
        return filter;
      },

      //TODO: упростить сигнатуру функции!
      //Гармонизировать сигнатуру с другими функциями (getSimpleFilter, getDataTriples)
      getExtendedFilter(
        shape: SparqlShapeInternal2,
        filterKey: string,
        schemaProperty: any,
        filterProperty: any,
        variable: Variable,
        // eslint-disable-next-line @typescript-eslint/camelcase
        subj: Quad_Subject,
        schema: any,
      ): any {
        const filter: any = {
          type: 'operation',
        };
        if (schemaProperty.type === 'object') {
          switch (filterProperty.relation) {
            case 'any':
              this.buildEnumFilter(filter, variable, filterProperty.value);
              break;
            case 'notAny':
              this.buildEnumFilter(filter, variable, filterProperty.value, 'url', '&&', '!=');
              break;
            default:
              break;
          }
          if (
            filterProperty.value[0] !== undefined &&
            typeof filterProperty.value[0] === 'string' &&
            filterProperty.relation === 'equal'
          ) {
            filter.operator = '=';
            filter.args = [variable, namedNode(queryPrefixes.deAbbreviateIri(filterProperty.value[0]))];
          }
        } else if (schemaProperty.type === 'string') {
          if (schemaProperty.format === 'iri') {
            switch (filterProperty.relation) {
              case 'equal':
                filter.operator = '=';
                filter.args = [variable, namedNode(queryPrefixes.deAbbreviateIri(filterProperty.value[0]))];
                break;
              case 'any':
                this.buildEnumFilter(filter, variable, filterProperty.value);
                break;
              case 'notAny':
                this.buildEnumFilter(filter, variable, filterProperty.value, 'url', '&&', '!=');
                break;
              default:
                break;
            }
          } else if (schemaProperty.format === 'date-time') {
            switch (filterProperty.relation) {
              case 'equal':
                filter.operator = '=';
                filter.args = [variable, literal(filterProperty.value[0], namedNode(`${xsd}dateTime`))];
                break;
              case 'notEqual':
                filter.operator = '!=';
                filter.args = [variable, literal(filterProperty.value[0], namedNode(`${xsd}dateTime`))];
                break;
              case 'after':
                filter.operator = '>=';
                filter.args = [variable, literal(filterProperty.value[0], namedNode(`${xsd}dateTime`))];
                break;
              case 'before':
                filter.operator = '<=';
                filter.args = [variable, literal(filterProperty.value[0], namedNode(`${xsd}dateTime`))];
                break;
              case 'between':
                filter.operator = '&&';
                filter.args = [
                  {
                    args: [variable, literal(filterProperty.value[0], namedNode(`${xsd}dateTime`))],
                    operator: '>=',
                    type: 'operation',
                  },
                  {
                    args: [variable, literal(filterProperty.value[1], namedNode(`${xsd}dateTime`))],
                    operator: '<',
                    type: 'operation',
                  },
                ];
                break;
              default:
                break;
            }
          } else {
            switch (filterProperty.relation) {
              case 'contains':
                filter.operator = 'contains';
                filter.args = [variable, literal(`${filterProperty.value[0]}`)];
                break;
              case 'notContains':
                filter.operator = '!';
                filter.args = [
                  {
                    args: [variable, literal(`${filterProperty.value[0]}`)],
                    operator: 'contains',
                    type: 'operation',
                  },
                ];
                break;
              case 'equal':
                filter.operator = '=';
                filter.args = [variable, literal(`${filterProperty.value[0]}`)];
                break;
              case 'startWith':
                filter.operator = 'strstarts';
                filter.args = [variable, literal(`${filterProperty.value[0]}`)];
                break;
              case 'endWith':
                filter.operator = 'strends';
                filter.args = [variable, literal(`${filterProperty.value[0]}`)];
                break;
              case 'regEx':
                filter.operator = 'regex';
                filter.args = [variable, literal(`${filterProperty.value[0]}`), literal('i')];
                break;
              default:
                break;
            }
          }
        } else if (schemaProperty.type === 'integer') {
          switch (filterProperty.relation) {
            case 'equal':
              filter.operator = '=';
              filter.args = [variable, literal(`${filterProperty.value[0]}`, namedNode(`${xsd}integer`))];
              break;
            case 'any':
              this.buildEnumFilter(filter, variable, filterProperty.value, 'integer');
              break;
            default:
              break;
          }
        } else if (schemaProperty.type === 'array') {
        }

        const propUri = getSchemaPropUri(schema, filterKey);
        switch (filterProperty.relation) {
          case 'exists':
            if (propUri) {
              filter.operator = 'exists';
              filter.args = [
                {
                  type: 'bgp',
                  triples: [triple(subj, queryPrefixes.getFullIriNamedNode(propUri), variable)],
                },
              ];
            }
            break;
          case 'notExists':
            if (propUri) {
              filter.operator = 'notexists';
              filter.args = [
                {
                  type: 'bgp',
                  triples: [triple(subj, queryPrefixes.getFullIriNamedNode(propUri), variable)],
                },
              ];
            }
            break;
          case 'unassigned':
            break;
          default:
            break;
        }
        return {
          expression: filter,
          type: 'filter',
        };
      },

      /**
       *
       * @param schema
       * @param conditions
       */
      processConditions(
        shape: SparqlShapeInternal2,
        schema: any,
        conditions: any,
      ): { bgps: Quad[]; options: Quad[]; filters: any[]; binds: any[] } {
        const bgps: Quad[] = [];
        const options: Quad[] = [];
        const filters: any[] = [];
        const binds: any[] = [];
        Object.keys(conditions).forEach((key) => {
          if (schema && schema.properties && !key.startsWith('@')) {
            const filterProperty = conditions[key];
            const schemaProperty = schema.properties[key];
            const propUri = getSchemaPropUri(schema, key);
            const varName = shape.props2vars[key];

            if (varName) {
              if (schemaProperty) {
                if (propUri) {
                  // add FILTER statement
                  if (filterProperty.value !== undefined && filterProperty.relation) {
                    filters.push(
                      this.getExtendedFilter(
                        shape,
                        key,
                        schemaProperty,
                        filterProperty,
                        variable(varName),
                        shape.subj,
                        schema,
                      ),
                    );
                  } else {
                    filters.push(this.getSimpleFilter(schemaProperty, filterProperty, variable(shape.props2vars[key])));
                  }
                } else {
                  // add BIND statement
                  if (filterProperty.bind) {
                    if (filterProperty.bind.relation) {
                      if (filterProperty.bind.relation === 'exists') {
                        const bind: any = {
                          expression: {
                            args: [
                              {
                                type: 'bgp',
                                triples: filterProperty.bind.triples,
                              },
                            ],
                            operator: 'exists',
                            type: 'operation',
                          },
                          type: 'bind',
                          variable: variable(varName),
                        };
                        binds.push(bind);
                      }
                    }
                  }
                }
              }
            } else {
              // add bgp condition triple
              if (schemaProperty && propUri) {
                let option;
                if (typeof filterProperty === 'string' && filterProperty.startsWith('?')) {
                  option = triple(
                    shape.subj,
                    queryPrefixes.getFullIriNamedNode(propUri),
                    variable(filterProperty.substring(1)),
                  );
                } else {
                  option = this.getConditionalTriple(schemaProperty, shape.subj, filterProperty, propUri);
                }
                //all schema-optional properties treats as required if conditional value exists
                //if (shape.schema.required && shape.schema.required.includes(key)) {
                bgps.push(option);
                //} else {
                //  options.push(option);
                //}
              }
            }
          }
        });
        return { bgps, options, filters, binds };
      },

      get internalShapes(): SparqlShapeInternal2[] {
        return self.shapes.map<SparqlShapeInternal2>((shapeVal, shapeIndex, shapeArray) => {
          const uriVar = this.genUniqueVarName('eIri', shapeIndex);
          const uri =
            (shapeVal.conditions && shapeVal.conditions.get('@id')) || (shapeVal.data && shapeVal.data.get('@id'));
          const internalShape: SparqlShapeInternal2 = {
            subj: this.genShapeSparqlSubject(uri, uriVar),
            props2vars: {},
            vars2props: {},
            query: {},
          };
          addprops2vars2props(internalShape, '@id', uriVar);
          return internalShape;
        });
      },

      get selectInternalShapes() {
        const internalShapes = this.internalShapes;
        self.shapes.forEach((shape, index) => {
          const internalShape = internalShapes[index];
          internalShape.query.variables = {};
          const shapeVariables: any = shape.variablesJs;
          copyUniqueObjectProps(internalShape.query.variables, shapeVariables);
          // if variables not set, copy all from schema except @type
          if (shape.schema.properties) {
            if (
              Object.keys(shapeVariables).length === 0 ||
              (Object.keys(shapeVariables).length === 1 && shapeVariables['@type'])
            ) {
              // copy as variables: all non-conditional properties, properties with "extended filter functions" or "bindings"
              // did not copy properties with conditions with values or reference ?xxx variables
              const ignoredProperties: JsObject = { '@type': null };
              if (shape.conditionsJs) {
                Object.keys(shape.conditionsJs).forEach((key) => {
                  const filterProperty = shape.conditionsJs[key];
                  if (
                    filterProperty.value === undefined &&
                    filterProperty.relation === undefined &&
                    filterProperty.bind === undefined
                  )
                    ignoredProperties[key] = null;
                });
              }
              copyUniqueObjectProps(
                internalShape.query.variables,
                copyObjectPropsWithRenameOrFilter(shape.schema.propertiesJs, ignoredProperties),
              );
            }
          }
          //renumerate variables from shape schema to avoid collisions in SPARQL query, but preserve variables not from schema
          Object.keys(internalShape.query.variables).forEach((key) => {
            if (!internalShape.props2vars[key]) {
              if (shape.schema.properties && shape.schema.properties.get(key))
                addprops2vars2props(internalShape, key, key + index);
              else addprops2vars2props(internalShape, key, key);
            }
          });
        });
        self.shapes.forEach((shape, index) => {
          const internalShape = internalShapes[index];
          const { bgps, options } = this.getWhereVar(internalShape, shape.schemaJs);
          const whereConditions = this.processConditions(internalShape, shape.schemaJs, shape.conditionsJs);
          internalShape.query.bgps = [...whereConditions.bgps, ...bgps];
          internalShape.query.options = [...whereConditions.options, ...options];
          internalShape.query.filters = whereConditions.filters;
          internalShape.query.binds = whereConditions.binds;
        });

        return internalShapes;
      },

      get selectObjectsInternalShapes() {
        const internalShapes = this.selectInternalShapes;
        self.shapes.forEach((shape, index) => {
          const internalShape = internalShapes[index];
          this.addToBgpTypeCondition(internalShape, shape.schemaJs);
        });
        return internalShapes;
      },

      // stringify()
      selectQueryFromShapes(internalShapes: SparqlShapeInternal2[]) {
        const query: SelectQuery = {
          type: 'query',
          queryType: 'SELECT',
          prefixes: queryPrefixes.currentJs,
          variables: [],
        };
        self.shapes.forEach((shape, index) => {
          // generate query
          const internalShape = internalShapes[index];
          // check variables for uniquiness
          const generatedVariables = propsToSparqlVars(internalShape);
          let variablesToAdd: Variable[];

          if (query.variables.length === 0) {
            variablesToAdd = generatedVariables;
          } else {
            variablesToAdd = [];
            let flag = false;
            generatedVariables.forEach((v1) => {
              for (let i = 0; i < query.variables.length; i++) {
                const v2 = (query.variables as Variable[])[i];
                if (v1.value === v2.value) {
                  flag = true;
                  break;
                }
              }
              if (flag === false) {
                variablesToAdd.push(v1);
              } else {
                flag = false;
              }
            });
          }
          //@ts-ignore
          query.variables.push(...variablesToAdd);

          // create result query from partial queries
          const results: any[] = [];
          addToResult(
            results,
            internalShape.query.bgps,
            internalShape.query.options,
            internalShape.query.filters,
            internalShape.query.binds,
          );
          this.addToWhere(results, query);
        });

        return query;
      },

      get selectObjectsQueryStr() {
        const internalShapes = this.selectObjectsInternalShapes;
        const query = this.selectQueryFromShapes(internalShapes);
        return gen.stringify(query as SelectQuery);
      },

      get selectObjectsWithTypeInfoShapes() {
        return this;
      },

      get selectObjectsWithTypeInfoQueryStr() {
        const internalShapes = this.selectInternalShapes;
        const query = this.selectQueryFromShapes(internalShapes);
        //this.createSelect().distinct(true);
        self.shapes.forEach((shape, index) => {
          const internalShape = internalShapes[index];
          this.addToWhereSuperTypesFilter(shape.schemaJs, internalShape.subj, query);
          //this.addToBgpTypeCondition(shape);
        });

        return gen.stringify(query as SelectQuery);
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {
    //const repository = getParentOfType(self, Repository);// as IRepository

    return {};
  });
export interface IQuery2 extends Instance<typeof Query2> {}
