/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { existsSync } from 'fs';
import { env } from 'custom-env';

// emulate create-react-app behaviour witn .env files
if (existsSync('.env.test.local')) {
  env('test.local');
} else if (existsSync('.env.test')) {
  env('test');
}

/**
 * Sparql Endpoint URL (адрес веб-сервиса)
 */
export const rdfServerUrl = process.env.REACT_APP_SERVER_RDF_URL || 'http://localhost:8181/rdf4j-server';
export const rmRepositoryParam = JSON.parse(process.env.REACT_APP_RM_REPOSITORY_PARAM || '{}');
export const rmRepositoryType = process.env.REACT_APP_RM_REPOSITORY_TYPE || 'native-rdfs';
