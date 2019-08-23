function strokesToScg(strokes) {
  var scg = 'SCG_INK\n' + strokes.length + '\n';
  strokes.forEach(function (stroke) {
    scg += stroke.length + '\n';
    stroke.forEach(function (p) {
      scg += p[0] + ' ' + p[1] + '\n';
    })
  })
  return scg;
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function createArray(l) {
  var array = new Array(l);
  for (var i = 0; i < l; i++) {
    array[i] = false;
  }
  return array;
}

function centerCoordinates(bboxes, c) {
  var midx = bboxes[c]['bbox']['X'] + 1 / 2 * bboxes[c]['bbox']['w'];
  var midy = bboxes[c]['bbox']['Y'] + 1 / 2 * bboxes[c]['bbox']['h'];

  return [midx, midy];
}

function sort_box_by_X(bbox1, bbox2) {
  var midX1 = bboxes[bbox1]['bbox']['X'] + 1 / 2 * bboxes[bbox1]['bbox']['w'];
  var midX2 = bboxes[bbox2]['bbox']['X'] + 1 / 2 * bboxes[bbox2]['bbox']['w'];
  return midX1 < midX2 ? -1 : 1;
}

function sort_box_by_Y(bbox1, bbox2) {
  var midY1 = bboxes[bbox1]['bbox']['Y'] + 1 / 2 * bboxes[bbox1]['bbox']['h'];
  var midY2 = bboxes[bbox2]['bbox']['Y'] + 1 / 2 * bboxes[bbox2]['bbox']['h'];
  return midY1 < midY2 ? -1 : 1;
}

function average(indices, bboxes, type) {
  var sum = 0,
    count = 0;
  for (var index of indices) {
    sum += bboxes[index]['bbox'][type];
    count++;
  }
  return sum / count;
}

function sort_hlines(line1, line2) {
  var ave1 = average(line1, bboxes, 'Y') + 1 / 2 * average(line1, bboxes, 'h');
  var ave2 = average(line2, bboxes, 'Y') + 1 / 2 * average(line2, bboxes, 'h');
  return ave1 < ave2 ? -1 : 1;
}

function sort_vlines(line1, line2) {
  var ave1 = average(line1, bboxes, 'X') + 1 / 2 * average(line1, bboxes, 'w');
  var ave2 = average(line2, bboxes, 'X') + 1 / 2 * average(line2, bboxes, 'w');
  return ave1 < ave2 ? -1 : 1;
}