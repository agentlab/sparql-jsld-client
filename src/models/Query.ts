import { getParentOfType, getSnapshot, Instance, types } from 'mobx-state-tree';
import { NamedNode, Quad, Quad_Subject, Term, Variable } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
import { Generator, SelectQuery, Update, VariableTerm } from 'sparqljs';

import {
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
  JsObject,
  JSONSchema6forRdf,
} from '../ObjectProvider';
import { Repository } from './Repository';
import { IJSONSchema7forRdf, JSONSchema7forRdf } from './Schemas';
import { addprops2vars2props, addTo, addToBgp, addToResult, getSchemaPropUri, propsToSparqlVars } from '../SparqlGen';

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

/**
 * Renumerates variables from shape schema to avoid collisions in SPARQL query,
 * but preserve variables not from schema
 */
function renumerateShapeVariables(shape: any, schema: any, index: number) {
  Object.keys(shape.query.variables).forEach((key) => {
    if (!shape.props2vars[key]) {
      if (schema.properties && schema.properties[key])
        addprops2vars2props(shape, key, key + index);
      else addprops2vars2props(shape, key, key);
    }
  });
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
    orderBy: types.union(types.array(types.frozen<any>()), types.undefined),
    limit: types.union(types.number, types.undefined),
    offset: types.union(types.number, types.undefined),
    distinct: types.union(types.boolean, types.undefined),
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

      getWhereVar(shape: SparqlShapeInternal2, schema: any, requireOptional = false): { bgps: Quad[]; options: Quad[] } {
        const bgps: Quad[] = [];
        const options: Quad[] = [];
        Object.keys(shape.query.variables).forEach((key) => {
          // filter @id, @type,...
          if (!key.startsWith('@')) {
            const propUri = getSchemaPropUri(schema, key);
            const varName = shape.props2vars[key];
            if (propUri && varName) {
              const option = triple(shape.subj, queryPrefixes.getFullIriNamedNode(propUri), variable(varName));
              if ((schema.required && schema.required.includes(key)) || requireOptional) {
                bgps.push(option);
              } else {
                options.push(option);
              }
            }
          }
        });
        return { bgps, options };
      },

      getWhereVarFromDataWithoutOptinals(shape: SparqlShapeInternal2, schema: any, data: any): any[] {
        const resultWhereVars = [];
        const bgp: Quad[] = [];
        Object.keys(data).forEach((propertyKey) => {
          if (!propertyKey.startsWith('@')) {
            // filter @id, @type,...
            const propUri = getSchemaPropUri(schema, propertyKey);
            if (propUri) {
              const option = triple(shape.subj, queryPrefixes.getFullIriNamedNode(propUri), variable(shape.props2vars[propertyKey]));
              bgp.push(option);
            }
          }
        });
        if (bgp.length > 0) {
          resultWhereVars.push({
            type: 'bgp',
            triples: bgp,
          });
        }
        return resultWhereVars;
      },

      addToWhere(whereStatements: any[], query: any) {
        if (query) {
          if (query.where) query.where.push(...whereStatements);
          else query.where = whereStatements;
        }
      },

      getTypeCondition(subj: NamedNode | Variable, schema: any): any[] {
        if (schema) {
          return [
            triple(
              subj,
              namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
              queryPrefixes.getFullIriNamedNode(schema['@id']),
            ),
          ];
        }
        return [];
      },

      /**
       * Former addToWhereSuperTypesFilter
       * @param schema
       * @param subj
       */
      createToWhereSuperTypesFilter(schema: any, subj: Term) {
        if (schema && schema.properties) {
          const typeFilter: any[] = [
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
                          args: [variable('supertype0'), queryPrefixes.getFullIriNamedNode(schema['@type'])],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ];
          return typeFilter;
        }
        return [];
      },

      addToBgpTypeCondition(shape: SparqlShapeInternal2, schema: any) {
        if (schema) {
          const t = triple(
            shape.subj,
            namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            queryPrefixes.getFullIriNamedNode(schema['@type']),
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

      /**
       *
       * @param shape
       */
      getDataTriples(subj: NamedNode | Variable, schema: any, data: any): any[] {
        if (subj.termType && subj.termType === 'NamedNode') subj = queryPrefixes.getFullIriNamedNode(subj);
        const triples: Quad[] = [];
        /*triples.push(
          triple(
            subj,
            namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            this.getFullIriNamedNode(shape.schema['@id']),
          ),
        );*/
        Object.keys(data).forEach((propertyKey) => {
          if (schema.properties && data) {
            const property = schema.properties[propertyKey];
            const value = data[propertyKey];
            if (!propertyKey.startsWith('@')) {
              const propUri = getSchemaPropUri(schema, propertyKey);
              if (property !== undefined && propUri) {
                let triple: Quad = this.getConditionalTriple(property, subj, value, propUri);
                if (triple) {
                  triples.push(triple);
                } else if (property.type === 'array') {
                  const prop = {
                    ...property,
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    ...(<any>property.items),
                  };
                  if (Array.isArray(value)) {
                    value.forEach((v) => {
                      triple = this.getConditionalTriple(prop, subj, v, propUri);
                      if (triple) triples.push(triple);
                    });
                  } else {
                    triple = this.getConditionalTriple(prop, subj, value, propUri);
                    if (triple) triples.push(triple);
                  }
                } else {
                  console.warn('getDataTriples: Unknown property');
                }
              }
            }
          }
        });
        return triples;
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

      get internalShapes() {
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

      /**
       * SELECT
       */

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
          renumerateShapeVariables(internalShape, shape.schemaJs, index);
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

        if (self.orderBy) query.order = self.orderBy;
        if (self.limit) query.limit = self.limit;
        if (self.offset) query.offset = self.offset;
        if (self.distinct) query.distinct = self.distinct;

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
        self.shapes.forEach((shape, index) => {
          const internalShape = internalShapes[index];
          query.where = [
            ...this.createToWhereSuperTypesFilter(shape.schemaJs, internalShape.subj),
            ...(query.where || []),
          ];
          //this.addToBgpTypeCondition(shape);
        });

        return gen.stringify(query);
      },

      /**
       * DELETE
       */

      deleteObjectQuery() {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insertdelete',
              delete: [],
              insert: [],
            },
          ],
        };
        self.shapes.forEach((shape, index) => {
          const internalShape = this.internalShapes[index];
          internalShape.query.variables = {
            ...shape.conditionsJs,
          };
          //renumerate variables to avoid collisions in SPARQL query
          Object.keys(internalShape.query.variables).forEach((key) => {
            if (!internalShape.props2vars[key]) addprops2vars2props(internalShape, key, key + index);
          });
          const pVarName = this.genUniqueVarName('p', index);
          const oVarName = this.genUniqueVarName('o', index);
          addTo(query.updates[0], 'delete', addToBgp([triple(internalShape.subj, variable(pVarName), variable(oVarName))]));

          let { bgps, options } = this.getWhereVar(internalShape, shape.schemaJs, true);
          let filters: any[] = [];
          let binds: any[] = [];
          bgps = [...this.getTypeCondition(internalShape.subj, shape.schemaJs), triple(internalShape.subj, variable(pVarName), variable(oVarName)), ...bgps];
          // if element has URI -- its enough otherwise we need to add other conditions
          if (!shape.conditionsJs['@id']) {
            const whereConditions = this.processConditions(internalShape, shape.schemaJs, shape.conditionsJs);
            bgps = [...whereConditions.bgps, ...bgps];
            options = [...whereConditions.options, ...options];
            filters = whereConditions.filters;
            binds = whereConditions.binds;
          }
          // TODO: create result query from partial queries
          //shape.query.bgps = bgps;
          //shape.query.options = options;
          //shape.query.filters = filters;
          const results: any[] = [];
          addToResult(results, bgps, options, filters, binds);
          addTo(query.updates[0], 'where', results);
        });
        return query;
      },

      get deleteObjectQueryStr() {
        const query = this.deleteObjectQuery();
        return gen.stringify(query);
      },

      /**
       * INSERT
       */

      insertObjectQuery() {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insert',
              insert: [],
            },
          ],
        };
        self.shapes.forEach((shape, index) => {
          const internalShape = this.internalShapes[index];
          const triples = this.getTypeCondition(internalShape.subj, shape.schemaJs)
            .concat(this.getDataTriples(internalShape.subj, shape.schemaJs, shape.dataJs));
          addTo(query.updates[0], 'insert', addToBgp(triples));
        });
        return query;
      },

      get insertObjectQueryStr() {
        const query = this.insertObjectQuery();
        return gen.stringify(query);
      },

     /**
       * UPDATE
       */
      updateObjectQuery() {
        const query: Update = {
          type: 'update',
          prefixes: queryPrefixes.currentJs,
          updates: [
            {
              updateType: 'insertdelete',
              delete: [],
              insert: [],
            },
          ],
        };
        self.shapes.forEach((shape, index) => {
          const internalShape = this.internalShapes[index];
          addTo(query.updates[0], 'insert', addToBgp(this.getDataTriples(internalShape.subj, shape.schemaJs, shape.dataJs)));
          internalShape.query.variables = {
            ...shape.conditionsJs,
            ...shape.dataJs,
          };
          renumerateShapeVariables(internalShape, shape.schemaJs, index);
          addTo(query.updates[0], 'delete', this.getWhereVarFromDataWithoutOptinals(internalShape, shape.schemaJs, shape.dataJs));

          let { bgps, options } = this.getWhereVar(internalShape, shape.schemaJs);
          let filters: any[] = [];
          let binds: any[] = [];
          bgps = [...this.getTypeCondition(internalShape.subj, shape.schemaJs), ...bgps];
          // if element has URI -- its enough otherwise we need to add other conditions
          if (!shape.conditionsJs['@id']) {
            const whereConditions = this.processConditions(internalShape, shape.schemaJs, shape.conditionsJs);
            bgps = [...whereConditions.bgps, ...bgps];
            options = [...whereConditions.options, ...options];
            filters = whereConditions.filters;
            binds = whereConditions.binds;
          }
          const results: any[] = [];
          addToResult(results, bgps, options, filters, binds);
          addTo(query.updates[0], 'where', results);
        });
        return query;
      },

      get updateObjectQueryStr() {
        //const internalShapes = this.selectObjectsInternalShapes;
        const query = this.updateObjectQuery();
        return gen.stringify(query);
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