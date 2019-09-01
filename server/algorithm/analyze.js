module.exports = {
  get_horizontal,
  get_vertical,
  divideStrokes,
  get_bboxes_from_strokes,
  strokesToScg,
  print
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
  //console.log(array);
  return array;
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

// run depth-first-search on the graph to get the connected componets
// each connected component means one line of boxes
function DFS(lines, matrix) {
  var l = matrix.length;
  var visited = createArray(l);

  for (var start = 0; start < l; start++) {
    if (!visited[start]) {
      visited[start] = true;
      var stack = [start];
      var component = [start];
      while (stack.length != 0) {
        var top = stack.pop();
        for (var j = 0; j < l; j++) {
          if (matrix[top][j] && !visited[j]) {
            stack.push(j);
            component.push(j);
            visited[j] = true;
          }
        }
      }
      lines.push(component);
    }
  }
}









// get a list of bboxes from all the symbols in the parse tree
// a symbol is any terminal digit/letter/operator,
function get_bboxes_from_symbols(tree, bboxes) {
  if (tree['type'] == 'symbol') {
    bboxes.push(tree);
  } else {
    get_bboxes_from_symbols(tree['lchild'], bboxes);
    get_bboxes_from_symbols(tree['rchild'], bboxes);
  }
}

function DFS_vertical(hlines, lines, matrix) {
  var l = matrix.length;
  var visited = createArray(l);

  for (var i = 0; i < hlines.length; i++) {
    for (var start of hlines[i]) {
      if (!visited[start]) {
        visited[start] = true;
        var stack = [start];
        var component = [start];
        while (stack.length != 0) {
          var top = stack.pop();
          for (var j = 0; j < l; j++) {
            if (matrix[top][j] && !visited[j]) {
              stack.push(j);
              component.push(j);
              visited[j] = true;
            }
          }
        }
        lines.push(component);
      }
    }
  }
}

// height overlap method
function get_horizontal(bboxes, hlines, p0) {
  var l = bboxes.length;
  var connected = createArray(l);
  
  var sort_box_by_X = function (bbox1, bbox2) {
    var midX1 = bboxes[bbox1]['bbox']['X'] + 1 / 2 * bboxes[bbox1]['bbox']['w'];
    var midX2 = bboxes[bbox2]['bbox']['X'] + 1 / 2 * bboxes[bbox2]['bbox']['w'];
    return midX1 < midX2 ? -1 : 1;
  }
  var sort_hlines = function (line1, line2) {
    var ave1 = average(line1, bboxes, 'Y') + 1 / 2 * average(line1, bboxes, 'h');
    var ave2 = average(line2, bboxes, 'Y') + 1 / 2 * average(line2, bboxes, 'h');
    return ave1 < ave2 ? -1 : 1;
  }

  for (var i = 0; i < l; i++) {
    connected[i] = createArray(l);
  }
  for (var i = 0; i < l; i++) {
    for (var j = i + 1; j < l; j++) {
      var vert_lap = overlap(bboxes, i, j, 'Y');
      if (vert_lap > p0) {
        connected[i][j] = true;
      }
    }
  }
  DFS(hlines, connected);
  for (var hline of hlines){
    hline.sort(sort_box_by_X);
  }
  hlines.sort(sort_hlines);
}


// center horizontal distance method
function get_horizontal1(bboxes, hlines, bound) {
  var l = bboxes.length;
  var heightav = average(Array.from(Array(l).keys()), boxes, 'h');

  for (bbox = 0; bbox < l; bbox++) {
    if (hlines.length == 0) {
      hlines.push([bbox]);
    } else {
      var need_new_line = true;
      for (var line of hlines) {
        var can_fit_in_line = true;
        for (var bbox2 of line) {
          var diffy = bboxes[bbox]['bbox']['Y'] - bboxes[bbox2]['bbox']['Y'] +
            1 / 2 * bboxes[bbox]['bbox']['h'] - 1 / 2 * bboxes[bbox2]['bbox']['h'];
          var factor = Math.abs(diffy / heightav);
          if (factor > bound || bbox == bbox2) {
            can_fit_in_line = false;
            break;
          }
        }
        if (can_fit_in_line) {
          need_new_line = false;
          line.push(bbox);
        }
      }
      if (need_new_line) {
        hlines.push([bbox]);
      }
    }
  }
}


// algorithm to get the list of vertial lines
// I call it an algorihm based on
// [the stable matching of maximum slope values] and [network level propagation]
function get_vertical(bboxes, hlines, vlines) {
  var l = bboxes.length;
  var matrix = new Array(l);
  var matrix2 = new Array(l);
  var sort_vlines = function (line1, line2) {
    var ave1 = average(line1, bboxes, 'X') + 1 / 2 * average(line1, bboxes, 'w');
    var ave2 = average(line2, bboxes, 'X') + 1 / 2 * average(line2, bboxes, 'w');
    return ave1 < ave2 ? -1 : 1;
  }

  // local functions
  var go_on = function (matches) {
    for (var key in matches) {
      var value = matches[key];
      if (value[0] != -1 || value[1] != -1) {
        return true;
      }
    }
    return false;
  }
  var apply_matched_state = function (matches, matched_state) {
    for (var key in matches) {
      if (matched_state[key]) {
        matches[key][0] = -1;
        matches[key][1] = -1;
      }
      for (var i = 0; i < matches[key].length; i++) {
        var value = matches[key][i];
        if (value != -1 && matched_state[value.toString()]) {
          matches[key][i] = -1;
        }
      }
    }
  }

  // data initializatoin
  for (var i = 0; i < l; i++) {
    matrix[i] = new Array(l);
    matrix2[i] = new Array();
  }
  for (var i = 0; i < l; i++) {
    for (var j = i; j < l; j++) {
      var bboxi = bboxes[i]['bbox'];
      var bboxj = bboxes[j]['bbox'];
      var diffx = bboxi['X'] + 1 / 2 * bboxi['w'] - bboxj['X'] - 1 / 2 * bboxj['w'];
      var diffy = bboxi['Y'] + 1 / 2 * bboxi['h'] - bboxj['Y'] - 1 / 2 * bboxj['h'];
      if (diffx == 0) {
        diffx = 1;
      }
      var slope = Number((Math.abs(diffy / diffx)).toFixed(3));
      matrix[i][j] = slope;
      matrix[j][i] = matrix[i][j];
      matrix2[i][j] = false;
      matrix2[j][i] = false;
    }
  }
  // core part of the algorithm
  for (var i1 = 0; i1 < hlines.length - 1; i1++) {
    for (var i2 = i1 + 1; i2 < hlines.length; i2++) {
      var matches12 = match(bboxes, hlines[i1], hlines[i2], matrix); // an Object
      var matches21 = match(bboxes, hlines[i2], hlines[i1], matrix);
      var matched_state = {};
      for (var ele in matches12) {
        matched_state[ele] = false;
      }
      for (var ele in matches21) {
        matched_state[ele] = false;
      }
      /*console.log('\n\nMatches from line ', i1,  ' to line ', i2);
      console.log(JSON.stringify(matches12));
      console.log('\nMatches from line ', i2,  ' to line ', i1);
      console.log(JSON.stringify(matches21));*/

      while (go_on(matches12)) {
        for (var ele1 in matches12) {
          var best_cand = matches12[ele1][0];
          if (best_cand == -1) {
            best_cand = matches12[ele1][1];
          }
          var best_cand2 = -1;
          if (best_cand != -1) {
            best_cand2 = matches21[best_cand.toString()][0];
            if (best_cand2 == -1) {
              best_cand2 = matches21[best_cand.toString()][1];
            }
          }
          if (best_cand != -1 && best_cand2 != -1) {
            if (Number(ele1) == best_cand2) {
              matrix2[Number(ele1)][best_cand] = true;
              matched_state[ele1] = true;
              matched_state[best_cand.toString()] = true;
            }
          }
          apply_matched_state(matches12, matched_state);
          apply_matched_state(matches21, matched_state);
        }
      }
    }
  }

  //console.log('\nRAW matrix: ')
  //console.log(matrix2);

  //console.log('\nDeleting useless edges: ')
  delete_edges(hlines, matrix2);
  //console.log(matrix2);

  //console.log('\nRunning DFS: ')
  DFS_vertical(hlines, vlines, matrix2);

  // sort the vertical lines
  vlines.sort(sort_vlines);
}

// get the maximum 2 numbers from a list of nonnegative numbers
// if indices = [], max1 and max2 are -1
// if indices length is 1, max2 is -1
function max_two(selected_indices, list) {
  var max1 = -Infinity,
    max1_index = -1;
  var max2 = -Infinity,
    max2_index = -1;

  for (var i of selected_indices) {
    if (list[i] > max1) {
      max2 = max1;
      max2_index = max1_index;
      max1 = list[i];
      max1_index = i;
    } else if (list[i] < max1 && list[i] > max2) {
      max2 = list[i];
      max2_index = i;
    }
  }
  return [max1_index, max2_index];
}

// check if the bases of 2 bounding boxes overlap
// if not, return 0
// if yes, return 2*overlapping length / (sum of the length of the bases)
function interval_overlap(bboxes, c1, c2) {
  var a = bboxes[c1]['bbox']['X'];
  var b = a + bboxes[c1]['bbox']['w'];
  var c = bboxes[c2]['bbox']['X'];
  var d = c + bboxes[c2]['bbox']['w'];

  var h1 = bboxes[c1]['bbox']['h'];
  var h2 = bboxes[c2]['bbox']['h'];

  // adjust the size of very narrow boxes
  // make width/height = 0.7
  if ((b - a) / h1 < 0.3) {
    var offset = (0.7 * h1 - (b - a)) / 2;
    a -= offset;
    b += offset;
  }
  if ((d - c) / h2 < 0.3) {
    var offset = (0.7 * h2 - (d - c)) / 2;
    c -= offset;
    d += offset;
  }

  if (c >= b || a >= d) {
    return 0;
  } else {
    var left_bnd = Math.max(a, c);
    var right_bnd = Math.min(b, d);
    return 2 * (right_bnd - left_bnd) / (b - a + d - c);
  }
}

// get the matching candidates from line2 of each element in line1
// candidates must have overlap with the element and
// be the top 2 that maximize the abs slope
function match(bboxes, line1, line2, matrix) {
  var match_candidates = {};

  for (var ele1 of line1) {
    var candidates = max_two(line2, matrix[ele1]);
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] != -1 && interval_overlap(bboxes, ele1, candidates[i]) == 0) {
        candidates[i] = -1;
      }
    }
    match_candidates[ele1.toString()] = candidates;
  }
  return match_candidates;
}

// get the j-th column of a matrix
function get_column(matrix, j) {
  var result = [];
  for (var i = 0; i < matrix.length; i++) {
    result.push(matrix[i][j]);
  }
  return result;
}


// delete superfluous (some are incorrect) edges in the graph of connected nodes
function delete_edges(hlines, matrix) {
  var level_info = {};
  for (var i = 0; i < hlines.length; i++) {
    for (var ele of hlines[i]) {
      level_info['' + ele] = i;
    }
  }
  //console.log('level info: ', level_info);

  for (var i = 0; i < matrix.length; i++) {
    //console.log('Processing: ', i);
    var into = get_column(matrix, i);
    var out = matrix[i];
    var min_into = Infinity;
    var min_out = Infinity;

    for (var j = 0; j < into.length; j++) {
      if (into[j]) {
        var level_diff = level_info['' + i] - level_info['' + j];
        if (level_diff < min_into) {
          min_into = level_diff;
        }
      }
    }
    for (var j = 0; j < out.length; j++) {
      if (out[j]) {
        var level_diff = level_info['' + j] - level_info['' + i];
        if (level_diff < min_out) {
          min_out = level_diff;
        }
      }
    }
    for (var j = 0; j < into.length; j++) {
      if (into[j]) {
        var level_diff = level_info['' + i] - level_info['' + j];
        if (level_diff != min_into) {
          matrix[j][i] = false;
          //console.log(j + ' to ' + i + ' deleted ');
        }
      }
    }
    for (var j = 0; j < out.length; j++) {
      if (out[j]) {
        var level_diff = level_info['' + j] - level_info['' + i];
        if (level_diff != min_out) {
          matrix[i][j] = false;
          //console.log(i + ' to ' + j + ' deleted ');
        }
      }
    }
  }
}

// print the list of horizontal/vertial lines according to the actual numbers
// instead of their indices in the lists of all bounding boxes
function print(lines, bboxes) {
  for (var line of lines) {
    var string = '';
    for (var bbox of line) {
      var target = bboxes[bbox]['label'];
      if (!target) {
        target = bboxes[bbox]['type'];
      }
      string += target + '  ';
    }
    console.log(string);
  }
}






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


// get the list of bboxes from the strokes data
// each stroke is a list of coordinate pairs
function get_bboxes_from_strokes(strokes) {
  var boxes = [];
  for (var i = 0; i < strokes.length; i++) {
    var stroke = strokes[i];
    var minx = Infinity,
      maxx = -Infinity;
    var miny = Infinity,
      maxy = -Infinity;
    for (var point of stroke) {
      if (point[0] < minx) {
        minx = point[0];
      }
      if (point[0] > maxx) {
        maxx = point[0];
      }
      if (point[1] < miny) {
        miny = point[1];
      }
      if (point[1] > maxy) {
        maxy = point[1];
      }
    }
    boxes.push({
      'bbox': {
        'X': minx,
        'Y': miny,
        'w': maxx - minx,
        'h': maxy - miny
      }
    });
  }
  return boxes;
}

// find how overlapped are box c1 and box c2, in X coordinates or Y coordinates
// the measure is defined in the documentation
function overlap(boxes, c1, c2, type) {
  var type2;
  if (type == 'X') {
    type2 = 'w';
  } else if (type == 'Y') {
    type2 = 'h';
  }
  var box1 = boxes[c1]['bbox'],
    box2 = boxes[c2]['bbox'];
  var a = box1[type],
    b = box1[type] + box1[type2];
  var c = box2[type],
    d = box2[type] + box2[type2];
  var h_sum = box1[type2] + box2[type2];

  if (b < c) {
    return (c - b) / (c - b + h_sum) - 1;
  } else if (d < a) {
    return (a - d) / (a - d + h_sum) - 1;
  }
  var diff = Math.min(b, d) - Math.max(a, c);
  if (b - a == 0 || d - c == 0) {
    return 1;
  }
  return Math.max(diff / ((b - a) == 0 ? 1 : (b - a)), diff / ((d - c) == 0 ? 1 : (d - c)));
}

// check if box c is special
// in multi-column arithmetic problems, the special ones are the long lines
function checkSpecial(boxes, c) {
  if (boxes[c]['bbox']['w'] / boxes[c]['bbox']['h'] > 5) {
    return 'long';
  }
  return 'normal';
}

// compute how much the minimal bbox enclosing box c1 and c2 "grows" vertically from c1
// if it doesn't "grow", return -1
function remainPercentage(boxes, c1, c2) {
  var box1 = boxes[c1]['bbox'];
  var box2 = boxes[c2]['bbox'];
  var a = box1['Y'];
  var b = box1['Y'] + box1['h'];
  var c = box2['Y'];
  var d = box2['Y'] + box2['h'];
  var height = Math.max(b, d) - Math.min(a, c);
  if (a < c) {
    return -1;
  }
  return (b - a) / height;
}

// the main method used to divide the strokes in a multi-column arithmetic problem into different lines
function divideStrokes(boxes, hlines, p0, p1) {
  var l = boxes.length;
  var connected = createArray(l);

  for (var i = 0; i < l; i++) {
    connected[i] = createArray(l);
  }
  for (var i = 0; i < l; i++) {
    /*if (checkSpecial(boxes, i) == 'long') {
      hlines.push([i]);
      continue;
    }*/
    for (var j = i + 1; j < l; j++) {
      var vert_lap = overlap(boxes, i, j, 'Y');
      var rate1 = remainPercentage(boxes, i, j);
      var rate2 = remainPercentage(boxes, j, i);
      //console.log('Between ', i, 'and ', j);
      //console.log(vert_lap);
      //console.log(Math.max(rate1, rate2));
      if (vert_lap > p0 || rate1 > p1 || rate2 > p1) {
        connected[i][j] = true;
      }
    }
  }
  //console.log(connected);
  DFS(hlines, connected);
}