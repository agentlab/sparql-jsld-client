/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { JSONSchema6forRdf } from "../ObjectProvider";

export const ViewShapeSchema: JSONSchema6forRdf = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	'@id': 'rm:ViewShape',
	'@type': 'sh:NodeShape',
	title: 'View Shape',
	description: 'Artifact Shape',
	targetClass: 'rm:View',
	type: 'object',
	'@context': {
	  '@type': 'rdf:type',
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
	},
	required: ['@id', '@type'],
};
