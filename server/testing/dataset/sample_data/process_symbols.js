const tools = require('../../../algorithm/analyze');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME' + 'PARAMETER');
  process.exit(1);
}

var filename = process.argv[2];
var p = 0.5;
if (process.argv[3]) {
  p = process.argv[3];
}

var data = fs.readFileSync(filename);
var bboxes_all = JSON.parse(data);
var result = analyze_symbols(bboxes_all);

function analyze_symbols(bboxes_all) {
  let result = {};
  for (var i = 0; i < Object.keys(bboxes_all).length; i++) {
    let bboxes = bboxes_all[i.toString()];
    console.log("\nShowing " + i + ": ");
    let hlines = [];
    let vlines = [];

    console.log("HORIZONTAL: ");
    tools.get_horizontal(bboxes, hlines, p);
    tools.print(hlines, bboxes);

    console.log("VERTICAL: ");
    tools.get_vertical(bboxes, hlines, vlines);
    tools.print(vlines, bboxes);
    result[i] = {
      'h': hlines,
      'v': vlines
    };
  }
  return result;
}