// eslint-disable-next-line @typescript-eslint/camelcase
import { Quad, Term, NamedNode, Variable, Quad_Subject } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';
//import isArray from 'lodash-es/isArray';
import _isUrl from 'is-url';
import { Generator, SparqlQuery } from 'sparqljs';
import { Bindings } from './SparqlClient';

import {
  JSONSchema6forRdf,
  JSONSchema6forRdfProperty,
  JsObject,
  copyObjectPropsWithRenameOrFilter,
  copyUniqueObjectProps,
} from './ObjectProvider';

export function isUrl(str: string): boolean {
  if (_isUrl(str) === true) return true;
  if (str.startsWith('cpgu:///')) return true;
  return false;
}

export function serializeUri(uri: string): string {
  if (isUrl(uri) === true) {
    return `<${uri}>`;
  }
  return uri;
}

function addOperation(operator: string, args: any[]): any {
  return {
    type: 'operation',
    operator,
    args,
  };
}

/**
 * BiMap on two JS objects
 * Maps Schema properties keys to SPARQL query variable names and vice versa
 * @param shape
 * @param propName
 * @param varName
 */
export function addprops2vars2props(shape: SparqlShape, propName: string, varName: string): void {
  shape.props2vars[propName] = varName;
  shape.vars2props[varName] = propName;
}

/**
 * Mapping from JSON Schema-like properties to SPARQL named variables
 * More complx then one to one because of '@id' props from JSON-LD
 * '@id' -> 'uri'
 * @param schemaProps -- map of properties
 */
function propsToSparqlVars(shape: SparqlShape): Variable[] {
  if (shape.variables === undefined) return [];
  const variables = Object.keys(shape.variables).map((key) => {
    const val = shape.props2vars[key];
    if (val) key = val;
    return variable(key);
  });
  return variables;
}

export function getSchemaPropUri(schema: JSONSchema6forRdf, propertyKey: string): string | undefined {
  const properties = schema.properties;
  const context = schema['@context'];
  if (properties && context && typeof context !== 'string') {
    const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
    if (prop !== undefined && propertyKey !== '@id') {
      const propContext = (context as any)[propertyKey];
      if (propContext) {
        if (typeof propContext === 'string') {
          return propContext;
        } else if (propContext['@id']) {
          return propContext['@id'];
        }
      }
    }
  }
  return undefined;
}

export function getSchemaPropType(
  properties: { [key: string]: JSONSchema6forRdfProperty },
  context: JsObject,
  propertyKey: string,
): string | undefined {
  const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
  const propContext = context[propertyKey];
  if (prop && prop.type && propContext && propContext['@type']) {
    if (prop.type === 'object') {
      return propContext['@type'];
    } else if (prop.type === 'string' && prop.format === 'iri') {
      return propContext['@type'];
    } else if (prop.type === 'array' && prop.items && (prop.items as any).type) {
      if ((prop.items as any).type === 'object') {
        return propContext['@type'];
      } else if ((prop.items as any).type === 'string' && (prop.items as any).format === 'iri') {
        return propContext['@type'];
      }
    }
  }
  return undefined;
}

export function selectPropertiesWithRefs(shape: SparqlShape): { [key: string]: string } {
  const propsWithRefs: { [key: string]: string } = {};
  const anyContext = shape.schema['@context'];
  const context = anyContext !== undefined && typeof anyContext !== 'string' ? anyContext : {};
  Object.keys(shape.variables).forEach((key) => {
    if (shape.schema.properties) {
      const propType = getSchemaPropType(shape.schema.properties, context, key);
      if (propType) propsWithRefs[key] = propType;
    }
  });
  return propsWithRefs;
}

export function addTo(query: any, key: string, statements: any[]): void {
  if (query) {
    if (query[key]) query[key].push(...statements);
    else query[key] = statements;
  }
}

export function addToBgp(triples: any[]): any[] {
  const resultBgp = [];
  if (triples.length > 0) {
    resultBgp.push({
      type: 'bgp',
      triples,
    });
  }
  return resultBgp;
}

const xsd = 'http://www.w3.org/2001/XMLSchema#';

export interface SparqlShape {
  subj: NamedNode | Variable;
  schema: JSONSchema6forRdf;
  conditions: JsObject;
  variables: JsObject;
  data: JsObject;
  props2vars: { [s: string]: string };
  vars2props: { [s: string]: string };
}

/**
 * SparqlGen Responsibilities:
 * Конвертация на основе JSON Schema:
 *  * Json objects (or shapes) -> Sparql request
 *  * Sparql response -> Json objects
 * Всегда работает с полной JSON Schema от ObjectProvider
 */
export class SparqlGen {
  shapes: SparqlShape[] = [];
  queryPrefixesMap: { [s: string]: string } = {};
  //queryPrefixesMapRevert: { [s: string]: string } = {};
  query: { [s: string]: any } = {};
  generator = new Generator();

  public constructor(queryPrefixes: { [s: string]: string }) {
    this.setQueryPrefixes(queryPrefixes);
  }

  setQueryPrefixes(queryPrefixes: { [s: string]: string }): void {
    this.queryPrefixesMap = queryPrefixes;
  }

  stringify(): string {
    return this.generator.stringify(this.query as SparqlQuery);
  }

  /**
   *
   * @param uri
   * @param varName
   */
  genShapeSparqlSubject(uri: string | undefined, varName: string): NamedNode | Variable {
    if (uri === undefined) {
      return variable(varName);
    }
    return this.getFullIriNamedNode(uri);
  }

  /**
   * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
   * @param fillQualifiedIri
   * @returns abbreviated IRI based on this.queryPrefixesMap
   * For example, the IRI http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral would be abbreviated as rdf:XMLLiteral
   */
  abbreviateIri(fillQualifiedIri: string): string {
    let nsEntries: { prefix: string; ns: string }[] = [];
    if (fillQualifiedIri) {
      Object.keys(this.queryPrefixesMap).forEach((prefix) => {
        let ns = this.queryPrefixesMap[prefix];
        if (fillQualifiedIri.startsWith(ns)) nsEntries.push({ prefix, ns });
      });
      if (nsEntries.length > 1) {
        nsEntries = [nsEntries.reduce((prev, curr) => (curr.ns.length > prev.ns.length ? curr : prev))];
      }
      if (nsEntries.length === 1) {
        const value = fillQualifiedIri.substring(nsEntries[0].ns.length);
        return `${nsEntries[0].prefix}:${value}`;
      } else {
        const [, value] = fillQualifiedIri.match(/[#]([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', ''];
        if (value) {
          const shortUri = fillQualifiedIri.substring(0, fillQualifiedIri.lastIndexOf(value));
          const prefix = Object.keys(this.queryPrefixesMap).find((key) => this.queryPrefixesMap[key] === shortUri);

          if (prefix) {
            return `${prefix}:${value}`;
          }
        }
      }
    }
    return fillQualifiedIri;
  }

  /**
   * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
   * @param abbreviatedIri
   * @returns not abbreviated Iri
   * For example, the IRI rdf:XMLLiteral would be de-abbreviated as http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral
   */
  deAbbreviateIri(abbreviatedIri: string): string {
    if (abbreviatedIri) {
      const [, prefixKey, propertyKey] = abbreviatedIri.match(/^([\d\w-_]+):([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', '', ''];
      if (prefixKey && propertyKey) return `${this.queryPrefixesMap[prefixKey]}${propertyKey}`;
    }
    return abbreviatedIri;
  }

  /**
   *
   * @param uri
   */
  getFullIriNamedNode(uri: string | NamedNode): NamedNode {
    if (typeof uri === 'object') {
      uri = uri.value;
    }
    return namedNode(this.deAbbreviateIri(uri));
  }

  getWhereVar(shape: SparqlShape): any[] {
    const resultWhereVars = [];
    const bgp: Quad[] = [];
    const optionals: Quad[] = [];
    Object.keys(shape.variables).forEach((propertyKey) => {
      if (!propertyKey.startsWith('@')) {
        // filter @id, @type,...
        const propUri = getSchemaPropUri(shape.schema, propertyKey);
        if (propUri) {
          const option = triple(shape.subj, this.getFullIriNamedNode(propUri), variable(shape.props2vars[propertyKey]));
          if (shape.schema.required && shape.schema.required.includes(propertyKey)) {
            bgp.push(option);
          } else {
            optionals.push(option);
          }
        }
      }
    });
    if (bgp.length > 0) {
      resultWhereVars.push({
        type: 'bgp',
        triples: bgp,
      });
    }
    optionals.forEach((option) => {
      resultWhereVars.push({
        type: 'optional',
        patterns: [
          {
            type: 'bgp',
            triples: [option],
          },
        ],
      });
    });
    return resultWhereVars;
  }

  getWhereVarWithoutOptinals(shape: SparqlShape): any[] {
    const resultWhereVars = [];
    const bgp: Quad[] = [];
    Object.keys(shape.data).forEach((propertyKey) => {
      if (!propertyKey.startsWith('@')) {
        // filter @id, @type,...
        const propUri = getSchemaPropUri(shape.schema, propertyKey);
        if (propUri) {
          const option = triple(shape.subj, this.getFullIriNamedNode(propUri), variable(shape.props2vars[propertyKey]));
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
  }

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
        filter.args = [filterKey, this.getFullIriNamedNode(filterValues[0])];
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
  }

  getSimpleFilter(schemaProperty: JSONSchema6forRdfProperty, filterProperty: any, variable: Variable): any {
    const filter: any = {
      operator: '=',
      type: 'operation',
    };
    if (schemaProperty.type === 'string') {
      if (schemaProperty.format === undefined) {
        filter.args = [variable, literal(`${filterProperty}`)];
      } else if (schemaProperty.format === 'iri') {
        filter.args = [variable, namedNode(`${this.deAbbreviateIri(filterProperty)}`)];
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
          filter.args = [variable, namedNode(`${this.deAbbreviateIri(filterProperty)}`)];
        else filter.args = [variable, literal(`${filterProperty}`)];
      }
    } else filter.args = [variable, literal(`${filterProperty}`)];
    return {
      expression: filter,
      type: 'filter',
    };
  }

  //TODO: упростить сигнатуру функции!
  //Гармонизировать сигнатуру с другими функциями (getSimpleFilter, getDataTriples)
  getExtendedFilter(
    shape: SparqlShape,
    filterKey: string,
    schemaProperty: JSONSchema6forRdfProperty,
    filterProperty: any,
    variable: Variable,
    // eslint-disable-next-line @typescript-eslint/camelcase
    subj: Quad_Subject,
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
        filterProperty.value[0] &&
        typeof filterProperty.value[0] === 'string' &&
        filterProperty.relation === 'equal'
      ) {
        filter.operator = '=';
        filter.args = [variable, namedNode(this.deAbbreviateIri(filterProperty.value[0]))];
      }
    } else if (schemaProperty.type === 'string') {
      if (schemaProperty.format === 'iri') {
        switch (filterProperty.relation) {
          case 'equal':
            filter.operator = '=';
            filter.args = [variable, namedNode(this.deAbbreviateIri(filterProperty.value[0]))];
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

    const propUri = getSchemaPropUri(shape.schema, filterKey);
    switch (filterProperty.relation) {
      case 'exist':
        if (propUri) {
          filter.operator = 'exists';
          filter.args = [
            {
              type: 'bgp',
              triples: [triple(subj, this.getFullIriNamedNode(propUri), variable)],
            },
          ];
        }
        break;
      case 'notExist':
        if (propUri) {
          filter.operator = 'notexists';
          filter.args = [
            {
              type: 'bgp',
              triples: [triple(subj, this.getFullIriNamedNode(propUri), variable)],
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
  }

  /**
   *
   * @param schema
   * @param subj
   */
  addToWhereSuperTypesFilter(shape: SparqlShape, subj: Term): SparqlGen {
    if (shape.schema && shape.schema.properties) {
      if (this.query) {
        const typeFilter = [
          triple(subj as Variable, this.getFullIriNamedNode('rdf:type'), variable('type0')),
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
                        args: [variable('supertype0'), this.getFullIriNamedNode(shape.schema['@id'])],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ];
        this.addToWhere(typeFilter);
      }
    }
    return this;
  }

  // TODO Убрать это как можно скорее и переделать алгоритм создания фильтра
  addFilterForDataTypeQuery(): SparqlGen {
    const typeFilter = {
      expression: addOperation('&&', [
        addOperation('isuri', [variable('uri')]),
        addOperation('strstarts', [
          addOperation('str', [variable('uri')]),
          addOperation('str', [namedNode('http://www.w3.org/2001/XMLSchema#')]),
        ]),
      ]),
      type: 'filter',
    };
    if (!this.query.where) {
      this.query.where = [];
    }
    this.query.where.push(typeFilter);
    return this;
  }

  addToWhereTypeCondition(shape: SparqlShape): SparqlGen {
    if (shape.schema) {
      this.addToWhereBgpTriple(
        triple(
          shape.subj,
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          this.getFullIriNamedNode(shape.schema['@id']),
        ),
      );
    }
    return this;
  }

  getTypeCondition(shape: SparqlShape): any[] {
    if (shape.schema) {
      return [
        triple(
          shape.subj,
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          this.getFullIriNamedNode(shape.schema['@id']),
        ),
      ];
    }
    return [];
  }

  /**
   *
   * @param schema
   * @param conditions
   */
  getFilters(shape: SparqlShape): any[] {
    const resultsFilters: any[] = [];
    Object.keys(shape.conditions).forEach((filterKey) => {
      if (shape.schema && shape.schema.properties && !filterKey.startsWith('@')) {
        const filterProperty = shape.conditions[filterKey];
        const schemaProperty = shape.schema.properties[filterKey];
        const propUri = getSchemaPropUri(shape.schema, filterKey);

        if (schemaProperty && propUri) {
          if (filterProperty.value && filterProperty.relation) {
            resultsFilters.push(
              this.getExtendedFilter(
                shape,
                filterKey,
                schemaProperty,
                filterProperty,
                variable(shape.props2vars[filterKey]),
                shape.subj,
              ),
            );
          } else {
            resultsFilters.push(
              this.getSimpleFilter(schemaProperty, filterProperty, variable(shape.props2vars[filterKey])),
            );
          }
        }
      }
    });
    return resultsFilters;
  }

  addToWhere(whereStatements: any[], query?: any): SparqlGen {
    if (!query) query = this.query;
    if (query) {
      if (query.where) query.where.push(...whereStatements);
      else query.where = whereStatements;
    }
    return this;
  }

  /**
   *
   * @param schema
   * @param conditions
   * @param variables
   */
  createSelect(): SparqlGen {
    this.query.type = 'query';
    this.query.queryType = 'SELECT';
    this.query.prefixes = this.queryPrefixesMap;
    this.query.variables = [];

    this.shapes.forEach((shape, index) => {
      // if variables not set, copy all from schema except @type
      if (
        (Object.keys(shape.variables).length === 0 ||
          (Object.keys(shape.variables).length === 1 && shape.variables['@type'])) &&
        shape.schema.properties
      ) {
        copyUniqueObjectProps(
          shape.variables,
          copyObjectPropsWithRenameOrFilter(shape.schema.properties, { '@type': null }),
        );
      }
      //renumerate variables from shape schema to avoid collisions in SPARQL query
      //but preserve variables not from schema
      Object.keys(shape.variables).forEach((key) => {
        if (!shape.props2vars[key]) {
          if (shape.schema.properties && shape.schema.properties[key]) addprops2vars2props(shape, key, key + index);
          else addprops2vars2props(shape, key, key);
        }
      });
    });
    this.shapes.forEach((shape, index) => {
      // process referenced schemas
      if (index < this.shapes.length - 1) {
        const propsAndRefs = selectPropertiesWithRefs(shape);
        Object.keys(propsAndRefs).forEach((key) => {
          for (let i = index; i < this.shapes.length; i++) {
            const nextShape = this.shapes[i];
            if (propsAndRefs[key] === nextShape.schema['@id']) {
              addprops2vars2props(shape, key, nextShape.props2vars['@id']);
              //delete shape.variables[key];
            }
          }
        });
      }
      // generate query
      // check variables for uniquiness
      const generatedVariables = propsToSparqlVars(shape);
      let variablesToAdd: Variable[];

      if (this.query.variables.length === 0) {
        variablesToAdd = generatedVariables;
      } else {
        variablesToAdd = [];
        let flag = false;
        generatedVariables.forEach((v1) => {
          for (let i = 0; i < this.query.variables.length; i++) {
            const v2 = (this.query.variables as Variable[])[i];
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
      this.query.variables.push(...variablesToAdd);
      this.addToWhere(this.getWhereVar(shape));
      this.addToWhere(this.getFilters(shape));
    });
    return this;
  }

  addToWhereBgpTriple(triple: any): SparqlGen {
    if (this.query.where) {
      const bgp = this.query.where.find((whereItem: any) => whereItem.type === 'bgp');
      if (bgp) {
        bgp.triples.unshift(triple);
      } else {
        this.query.where.unshift({
          type: 'bgp',
          triples: [triple],
        });
      }
    }
    return this;
  }

  addToWhereOptionalTriple(triple: any): SparqlGen {
    if (this.query.where) {
      this.query.where.push({
        type: 'optional',
        patterns: [
          {
            type: 'bgp',
            triples: [triple],
          },
        ],
      });
    }
    return this;
  }

  limit(limit: number): SparqlGen {
    this.query.limit = limit;
    return this;
  }
  offset(offset: number): SparqlGen {
    this.query.offset = offset;
    return this;
  }
  orderBy(orderList: any[]): SparqlGen {
    if (orderList.length > 0) {
      this.query.order = orderList;
    }
    return this;
  }
  distinct(distinct: boolean): SparqlGen {
    this.query.distinct = distinct;
    return this;
  }

  getConditionalTriple(property: JSONSchema6forRdfProperty, subj: any, value: any, propUri: string): Quad {
    if (property.type === 'string') {
      if (property.format === undefined) {
        value = literal(`${value}`, namedNode(`${xsd}string`));
      } else if (property.format === 'iri') {
        value = this.getFullIriNamedNode(value);
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
      }
    }
    return triple(subj, this.getFullIriNamedNode(propUri), value);
  }

  /**
   *
   * @param shape
   */
  getDataTriples(shape: SparqlShape): any[] {
    let subj = shape.subj;
    if (subj.termType && subj.termType === 'NamedNode') subj = this.getFullIriNamedNode(subj);
    const triples: Quad[] = [];
    /*triples.push(
      triple(
        subj,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        this.getFullIriNamedNode(shape.schema['@id']),
      ),
    );*/
    Object.keys(shape.data).forEach((propertyKey) => {
      if (shape.schema.properties && shape.data) {
        const property: JSONSchema6forRdfProperty = shape.schema.properties[propertyKey];
        const value = shape.data[propertyKey];
        if (!propertyKey.startsWith('@')) {
          const propUri = getSchemaPropUri(shape.schema, propertyKey);
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
  }

  insertObjectQuery(): SparqlGen {
    this.query.type = 'update';
    this.query.prefixes = this.queryPrefixesMap;
    this.query.updates = [
      {
        updateType: 'insert',
        insert: [],
      },
    ];
    this.shapes.forEach((shape) => {
      const triples = this.getTypeCondition(shape).concat(this.getDataTriples(shape));
      addTo(this.query.updates[0], 'insert', addToBgp(triples));
    });
    return this;
  }

  selectObjectsWithTypeInfoQuery(): SparqlGen {
    this.createSelect().distinct(true);
    this.shapes.forEach((shape) => {
      this.addToWhereSuperTypesFilter(shape, shape.subj);
      //this.addToWhereTypeCondition(shape);
    });
    return this;
  }

  selectObjectsQuery(): SparqlGen {
    this.createSelect();
    this.shapes.forEach((shape) => this.addToWhereTypeCondition(shape));
    return this;
  }

  updateObjectQuery(): SparqlGen {
    this.query.type = 'update';
    this.query.prefixes = this.queryPrefixesMap;
    this.query.updates = [
      {
        updateType: 'insertdelete',
        delete: [],
        insert: [],
      },
    ];
    this.shapes.forEach((shape, index) => {
      addTo(this.query.updates[0], 'insert', addToBgp(this.getDataTriples(shape)));
      shape.variables = {
        ...shape.conditions,
        ...shape.data,
      };
      //renumerate variables to avoid collisions in SPARQL query
      Object.keys(shape.variables).forEach((key) => {
        if (!shape.props2vars[key]) addprops2vars2props(shape, key, key + index);
      });
      addTo(this.query.updates[0], 'delete', this.getWhereVarWithoutOptinals(shape));
      addTo(this.query.updates[0], 'where', addToBgp(this.getTypeCondition(shape)));
      addTo(this.query.updates[0], 'where', this.getWhereVar(shape));
      if (!shape.conditions['@id']) addTo(this.query.updates[0], 'where', this.getFilters(shape)); // if element has URI -- its enough otherwise we need to add other conditions
    });
    return this;
  }

  deleteObjectQuery(): SparqlGen {
    this.query.type = 'update';
    this.query.prefixes = this.queryPrefixesMap;
    this.query.updates = [
      {
        updateType: 'insertdelete',
        delete: [],
        insert: [],
      },
    ];
    this.shapes.forEach((shape, index) => {
      shape.variables = {
        ...shape.conditions,
      };
      //renumerate variables to avoid collisions in SPARQL query
      Object.keys(shape.variables).forEach((key) => {
        if (!shape.props2vars[key]) addprops2vars2props(shape, key, key + index);
      });
      const pVarName = this.genUniqueVarName('p', index);
      const oVarName = this.genUniqueVarName('o', index);
      addTo(this.query.updates[0], 'delete', addToBgp([triple(shape.subj, variable(pVarName), variable(oVarName))]));
      addTo(this.query.updates[0], 'where', addToBgp([triple(shape.subj, variable(pVarName), variable(oVarName))]));

      const tc = this.getTypeCondition(shape);
      addTo(this.query.updates[0], 'where', addToBgp(tc));
      addTo(this.query.updates[0], 'where', this.getWhereVar(shape));
      if (!shape.conditions['@id']) addTo(this.query.updates[0], 'where', this.getFilters(shape)); // if element has URI -- its enough otherwise we need to add other conditions
    });
    return this;
  }

  /**
   * First added shape is the main shape. Second and rest shapes are dependand to the main
   * shape and each other SUBSEQUENT shape by properties if its schemas references each other
   * by this properties
   * @param schema
   * @param conditions
   * @param variables
   * @param data
   */
  addSparqlShape(
    schema: JSONSchema6forRdf,
    conditions: JsObject = {},
    variables: JsObject = {},
    data: JsObject = {},
  ): SparqlGen {
    const shape: SparqlShape = {
      subj: variable('s'),
      schema,
      conditions,
      variables,
      data,
      props2vars: {},
      vars2props: {},
    };
    this.shapes.push(shape);
    const uriVar = this.genUniqueVarName('eIri', this.shapes.length - 1);
    const uri = conditions['@id'] || data['@id'];
    shape.subj = this.genShapeSparqlSubject(uri, uriVar);
    addprops2vars2props(shape, '@id', uriVar);
    return this;
  }

  /**
   * generate unique variable name for element iri & check for uniquiness
   * @param varPref '
   * @param no
   */
  genUniqueVarName(varPref: string, no: number): string {
    let varName = varPref + no;
    this.shapes.forEach((shape) => {
      while (shape.schema.properties && shape.schema.properties[varName]) {
        varName += this.shapes.length;
      }
    });
    return varName;
  }

  /**
   * Converts SPARQL results into internal JS objects according to JSON Schema from shape
   * Also converts RDFS variable values into JSON values
   * @param bindings
   * TODO: Add array properties processing
   */
  sparqlBindingsToObjectProp(bindings: Bindings): JsObject {
    let obj: JsObject | undefined = undefined;
    this.shapes.forEach((shape) => {
      obj = this.sparqlBindingsToObjectByShape(bindings, shape);
    });
    if (!obj) obj = {};
    return obj;
  }

  /**
   * Converts SPARQL results into one internal JS object according to JSON Schema from shape
   * retrieved by schemaIri
   * Also converts RDFS variable values into JSON values
   * @param bindings
   * @param schemaIri
   */
  sparqlBindingsToObjectBySchemaIri(bindings: Bindings, schemaIri: string): JsObject {
    const shape = this.shapes.find((sh) => sh.schema['@id'] === schemaIri);
    if (shape) {
      return this.sparqlBindingsToObjectByShape(bindings, shape);
    }
    return {};
  }

  sparqlBindingsToObjectByShape(bindings: Bindings, shape: SparqlShape): JsObject {
    const obj: JsObject = {};
    if (shape.schema.properties) {
      let prop: JSONSchema6forRdfProperty | undefined;
      Object.keys(shape.schema.properties).forEach((propKey) => {
        if (shape.schema.properties) {
          prop = shape.schema.properties[propKey];
        } else prop = undefined;
        const varKey = shape.props2vars[propKey];
        obj[propKey] = this.valueRdfsToJson(prop, bindings[varKey]?.value);
      });
    }
    //
    Object.keys(shape.conditions).forEach((condition) => {
      if (!obj[condition] && shape.variables[condition]) {
        obj[condition] = shape.conditions[condition];
      }
    });
    if (!obj['@type'] && shape.schema) obj['@type'] = shape.schema['@type'];
    return obj;
  }

  valueRdfsToJson(prop: JSONSchema6forRdfProperty | undefined, val: any): any {
    if (prop) {
      const type = prop.type;
      if (type && val) {
        if (type === 'integer') return parseInt(val, 10);
        if (type === 'boolean') {
          if (val === 'true') return true;
          if (val === 'false') return false;
        }
        if (type === 'string') {
          if (prop?.format === 'iri') return this.abbreviateIri(val);
        }
        if (type === 'object') {
          if (typeof val === 'string') return this.abbreviateIri(val);
        }
      }
    }
    return val;
  }
}
