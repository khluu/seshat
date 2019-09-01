const tools = require('../algorithm/analyze');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' DIRECTORY' + 'PARAMETER');
  process.exit(1);
}
let directory = process.argv[2];
let p = 0.5;
if (process.argv[3]) {
  p = process.argv[3];
}

if (fs.existsSync(directory + 'bboxes.json')) {
  fs.readFile(directory + 'bboxes.json', function (err, data) {
    if (err) throw err;
    let bboxes_all = JSON.parse(data)['bboxes'];
    let result = analyze_symbols(bboxes_all);
    /*fs.writeFile('symbol_truth.json', JSON.stringify(result), (err) => {
      if (err) throw err;
    });*/
  });
} else if (fs.existsSync(directory + 'line0')) {
  let i = 0;
  let bboxes_all = [];
  while (fs.existsSync(directory + 'line' + i)) {
    let data = fs.readFileSync(directory + 'line' + i + '/bboxes.json');
    let bboxes = JSON.parse(data)['bboxes'];
    for (let bbox of bboxes) {
      bboxes_all.push(bbox);
    }
    i++;
  }
  fs.writeFileSync(directory + 'bboxes.json', JSON.stringify({
    'bboxes': bboxes_all
  }));
  let result = analyze_symbols(bboxes_all);
}

function analyze_symbols(bboxes) {
  let result = {};
  let hlines = [];
  let vlines = [];

  console.log("Rows: ");
  //console.log(bboxes);
  tools.get_horizontal(bboxes, hlines, p);
  tools.print(hlines, bboxes);

  console.log("Columns: ");
  tools.get_vertical(bboxes, hlines, vlines);
  tools.print(vlines, bboxes);
  result = {
    'h': hlines,
    'v': vlines
  };
  return result;
}