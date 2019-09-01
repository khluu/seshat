const tools = require('../algorithm/analyze');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME' + ' -[mode]');
  process.exit(1);
}
var filename = process.argv[2];
var list = filename.split('/');
var directory = list[0] + '/' + list[1] + '/';
var not_divide_mode = true;
if (process.argv[3]) {
  not_divide_mode = false;
}

fs.readFile(filename, function (err, data) {
  if (err) throw err;
  let strokes = JSON.parse(data);
  let scg = tools.strokesToScg(strokes);
  fs.writeFileSync(directory + 'input.scgink', scg);

  if (!not_divide_mode) {
    let bboxes = tools.get_bboxes_from_strokes(strokes);
    let strokes_groups = [];

    tools.divideStrokes(bboxes, strokes_groups, 0.6, 0.7);
    console.log('Lines of strokes: ');
    console.log(JSON.stringify(strokes_groups));

    for (let j = 0; j < strokes_groups.length; j++) {
      let strokes_gj = []; // strokes group j
      for (let box of strokes_groups[j]) {
        strokes_gj.push(strokes[box]);
      }
      //console.log(strokes_gj);
      let scg_gj = tools.strokesToScg(strokes_gj);
      let new_dir = directory + 'line' + j + '/';
      if (!fs.existsSync(new_dir)){
        fs.mkdirSync(new_dir);
      }
      fs.writeFileSync(new_dir + 'strokes.json', JSON.stringify(strokes_gj));
      fs.writeFileSync(new_dir + 'input.scgink', scg_gj);
    }
  }
});