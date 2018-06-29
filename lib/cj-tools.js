"use babel";

import { CompositeDisposable } from "atom";
import Path from "path";
import { spawn } from "child_process";

export default {
  cjToolsView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "cj-tools:findFilesContaining": () => this.findFilesContaining(),
        "cj-tools:findLineInFile": () => this.findLineInFile()
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  /* Use nested array below because pretty print reformats non-nested array  */
  findOptionsPerLine(searchFor) {
    return [
      ["."],
      ["-name", "node_modules", "-prune", "-o"],
      ["-name", ".git", "-prune", "-o"],
      ["-name", ".build", "-prune", "-o"],
      ["-name", "build", "-prune", "-o"],
      ["-name", ".next", "-prune", "-o"],
      ["-name", "_next", "-prune", "-o"],
      ["-name", "*.js"],
      ["-exec", "grep", "-inH", searchFor, "{}", ";"]
    ];
  },

  findFilesContaining() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return atom.notifications.addError("No active editor.");
    const findStr = editor.getSelectedText();
    if (!findStr)
      return atom.notifications.addError("Select text to search for.");
    const findStrs = findStr.trim().split(" ");
    if (findStrs.length != 1)
      return atom.notifications.addError(
        `Only single word select/search allowed. (Saw ${findStrs})`
      );
    const findOptions = [].concat.apply(
      [],
      this.findOptionsPerLine(findStrs[0])
    );
    const path = atom.project.getPaths()[0];
    const findFile = Path.join(path, "find.txt");
    atom.workspace.open(findFile).then(findBuffer => {
      this.findBuffer = findBuffer;
      findBuffer.selectAll();
      findBuffer.delete();
      const find = spawn("find", findOptions, { cwd: path });
      find.stdout.on("data", data => findBuffer.insertText(`${data}`));
      find.stderr.on("data", data => findBuffer.insertText(`${data})`));
      find.on("close", ec => {
        findBuffer.insertText(`find ended with ${ec}\n`);
        findBuffer.setCursorScreenPosition({ row: 0, col: 0 });
      });
    });
  },

  findLineInFile() {
    if (!this.findBuffer) return;
    const position = this.findBuffer.getCursorBufferPosition();
    console.log(this.findBuffer.lineTextForBufferRow(position.row));
    /* TODO - open file for viewing */
  }
};
