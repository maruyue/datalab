/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

/// <reference path="../../modules/ApiManager.ts" />

// Instead of writing a .d.ts file containing this one line.
declare function marked(markdown: string): string;

/**
 * Details pane element for Datalab.
 * This element is designed to be displayed in a side bar that displays more
 * information about a selected file.
 */
class DetailsPaneElement extends Polymer.Element {

  private static _noFileMessage = 'Select an item to view its details.';
  private static _emptyFileMessage = 'Empty file.';
  private static _emptyNotebookMessage = 'Empty notebook.';
  private static _longNotebookMessage = 'Showing markdown from the first two.';
  private static _longFileMessage = 'Showing the first 30.';

  /**
   * File whose details to show.
   */
  public file: ApiFile;

  /**
   * Whether the pane is actively tracking selected items. This is used to avoid fetching the
   * selected file's data if the pane is closed by the host element.
   */
  public active: boolean;

  private _message = ''; // To show in the placeholder field.

  static get is() { return 'details-pane'; }

  static get properties() {
    return {
      _message: {
        type: String,
        value: '',
      },
      active: {
        observer: '_reloadDetails',
        type: Boolean,
        value: true,
      },
      file: {
        observer: '_reloadDetails',
        type: Object,
        value: {},
      },
    };
  }

  ready() {
    this._message = DetailsPaneElement._noFileMessage;
    super.ready();
  }

  /**
   * Loads the details of the given file in the details pane. No preview is shown if the
   * selected item is a directory. For notebooks, the first two cells are pulled from the file,
   * and any markdown they contain is rendered in the pane. For now, we also support other
   * plain text files with mime type text/*, and JSON files.
   *
   * TODO: Consider adding a spinning animation while this data loads.
   */
  _reloadDetails() {
    if (!this.file || !this.active) {
      this._message = DetailsPaneElement._noFileMessage;
      return;
    }

    if (this.file.type === 'notebook' || this._isPlainTextFile(this.file)) {
      ApiManager.getJupyterFile(this.file.path)
        .then((file: JupyterFile) => {

          // If this is a notebook, get the first two cells and render any markdown in them.
          if (file.type === 'notebook') {
            const cells = (file.content as JupyterNotebookModel).cells;
            if (cells.length === 0) {
              this.$.previewHtml.innerHTML = '';
              this._message = DetailsPaneElement._emptyNotebookMessage;
            } else {
              const firstTwoCells = cells.slice(0, 2);

              let markdownHtml = '';
              firstTwoCells.forEach((cell) => {
                if (cell.cell_type === 'markdown') {
                  markdownHtml += marked(cell.source);
                }
              });
              this.$.previewHtml.innerHTML = markdownHtml;
              this._message = ' Notebook with ' + cells.length + ' cells. ';
              if (cells.length > 2) {
                this._message += DetailsPaneElement._longNotebookMessage;
              }
            }

          // If this is a text file, show the first N lines.
          } else if (this._isPlainTextFile(file)) {

            const content = file.content as string;
            if (content.trim() === '') {
              this.$.previewHtml.innerHTML = '';
              this._message = DetailsPaneElement._emptyFileMessage;
            } else {
              const lines = content.split('\n');
              this._message = 'File with ' + lines.length + ' lines. ';
              this.$.previewHtml.innerText = '\n' +
                  lines.slice(0, 30).join('\n') +
                  '\n';
              if (lines.length > 30) {
                this.$.previewHtml.innerText += '...\n\n';
                this._message += DetailsPaneElement._longFileMessage;
              }
            }
          }
        })
        .catch(() => {
          this.$.previewHtml.innerHTML = '';
          this._message = '';
          console.log('Could not get item details.');
        });
    } else {
      this.$.previewHtml.innerHTML = '';
      this._message = '';
    }
  }

  /**
   * Returns true if the contents of this file can be read as plain text.
   * @param file object for the file whose details to display.
   */
  _isPlainTextFile(file: JupyterFile) {
    return file &&
           file.mimetype && (
             file.mimetype.indexOf('text/') > -1 ||
             file.mimetype.indexOf('application/json') > -1
           );
  }

}

customElements.define(DetailsPaneElement.is, DetailsPaneElement);
