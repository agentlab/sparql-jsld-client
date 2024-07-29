/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { readFileSync } from 'fs';
import { FileUploadConfig, SparqlClient } from './SparqlClient';

export async function uploadFiles(client: SparqlClient, files: FileUploadConfig[], rootFolder = ''): Promise<void> {
  //console.debug('uploadFiles ', files);
  let statements = '';
  files.forEach((f) => {
    statements = statements + readFileSync(rootFolder + f.file, 'utf8');
  });

  if (statements.length > 0 && files.length > 0) {
    await client.uploadStatements(statements, files[0].baseURI);
  }
}
