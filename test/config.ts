/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { existsSync } from 'fs';
import customEnv from 'custom-env';
import { JsObject } from '../src';

// emulate create-react-app behavior with .env files
if (existsSync('.env.test.local')) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  customEnv.env('test.local');
} else if (existsSync('.env.test')) {
  customEnv.env('test');
}

/**
 * Sparql Endpoint URL
 */
export const rdfServerUrl = process.env.REACT_APP_SERVER_RDF_URL ?? 'http://localhost:8181/rdf4j-server';
export const rmRepositoryParam: JsObject = JSON.parse(process.env.REACT_APP_RM_REPOSITORY_PARAM ?? '{}') as JsObject;
export const rmRepositoryType = process.env.REACT_APP_RM_REPOSITORY_TYPE ?? 'native-rdfs';
