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
  if (boxes[c]['bbox']['w'] > 150) {
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

// the main method used to divide the strokes in a multi-column arithmetic problem into different lines
function divideStrokes(boxes, hlines, p0, p1) {
  var l = boxes.length;
  var connected = createArray(l);

  for (var i = 0; i < l; i++) {
    connected[i] = createArray(l);
  }
  for (var i = 0; i < l; i++) {
    if (checkSpecial(boxes, i) == 'long') {
      hlines.push([i]);
      continue;
    }
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
  DFS(hlines, connected);
}