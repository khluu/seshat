function encode_relative(state_json) {
  elm_list = Object.entries(state_json);
  var rel_objs = {};
  for (var i = 0; i < elm_list.length; i++) {
    rel_objs[elm_list[i][0]] = {
      "to_left": [],
      "to_right": [],
      "above": [],
      "below": []
    }
  }

  elm_list = Object.entries(state_json);
  for (var i = 0; i < elm_list.length; i++) {
    for (var j = 0; j < elm_list.length; j++) {
      if (i != j) {
        var [a_n, a_obj] = elm_list[i];
        var [b_n, b_obj] = elm_list[j];
        if (a_obj.offsetTop > b_obj.offsetTop &&
          a_obj.offsetLeft < b_obj.offsetLeft + b_obj.offsetWidth &&
          a_obj.offsetLeft + a_obj.offsetWidth > b_obj.offsetLeft) {

          var dist = a_obj.offsetTop - b_obj.offsetTop;
          rel_objs[a_n]["above"].push([b_n, dist]);
          rel_objs[b_n]["below"].push([a_n, dist]);
        }
        if (a_obj.offsetLeft < b_obj.offsetLeft &&
          a_obj.offsetTop + a_obj.offsetHeight > b_obj.offsetTop &&
          a_obj.offsetTop < b_obj.offsetTop + b_obj.offsetHeight) {

          var dist = b_obj.offsetLeft - a_obj.offsetLeft;
          rel_objs[a_n]["to_right"].push([b_n, dist]);
          rel_objs[b_n]["to_left"].push([a_n, dist]);

        }
      }
    }
  }
  var grab1st = function(x) { return x[0]; };
  var compare2nd = function(x, y) { return x[1] > y[1]; };
  for (var i = 0; i < elm_list.length; i++) {
    var rel_obj = rel_objs[elm_list[i][0]];
    rel_obj["below"] = rel_obj["below"].sort(compare2nd).map(grab1st).join(' ');
    rel_obj["above"] = rel_obj["above"].sort(compare2nd).map(grab1st).join(' ');
    rel_obj["to_right"] = rel_obj["to_right"].sort(compare2nd).map(grab1st).join(' ');
    rel_obj["to_left"] = rel_obj["to_left"].sort(compare2nd).map(grab1st).join(' ');
  }

  for (var i = 0; i < elm_list.length; i++) {
    var obj = state_json[elm_list[i][0]];
    var rel_obj = rel_objs[elm_list[i][0]];
    obj["below"] = rel_obj["below"];
    obj["above"] = rel_obj["above"];
    obj["to_right"] = rel_obj["to_right"];
    obj["to_left"] = rel_obj["to_left"];
    state_json[elm_list[i][0]] = obj;
  }
}

// customized export of one line in the export
// since recursion is used here, one function for one 1ine
function custom_export_line(tree, tree_new){
  var map = {'0':1, '1':1, '2':1, '3':1, '4':2, '5':2, '6':1, '7':1, '8':1, '9':1};
  var round = function(x) { return Math.round(x * 100) / 100 };
  /*var bbox = tree['bounding-box'];
  if (bbox) {
    tree_new['bounding_box'] = bbox;
  }*/

  var type = tree['type'];
  if (type){
    tree_new['type'] = type;
    if (type == 'number'){
      tree_new['digits'] = {};
    }
  }
    
  var label = tree['label'];
  if (label){
    tree_new['label'] = label;
  }

  var value = tree['value'];
  if (value){
    tree_new['value'] = value;
  }

  var items = tree['items'];
  var minx_all = Infinity, miny_all = Infinity, maxx_all = 0, maxy_all = 0;
  // the 'bounding-box' entry in the raw export should be the bounding box of the
  // object that 'type' or 'label' indicates. So it should be the bounding box of 
  // the strokes in the 'items' entry. But I found some exceptions with incomplete
  // expressions, such as + 45. I'm still trying to figure out why.
  // At least right now, I get the bounding box from the strokes.
  if (items) {
    tree_new['items'] = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var minx = Math.min(...item['X']), maxx = Math.max(...item['X']),
          miny = Math.min(...item['Y']), maxy = Math.max(...item['Y']);
      minx_all = minx < minx_all ? minx : minx_all;
      miny_all = miny < miny_all ? miny : miny_all;
      maxx_all = maxx > maxx_all ? maxx : maxx_all;
      maxy_all = maxy > maxy_all ? maxy : maxy_all;
      tree_new['items'].push({ 'minX': round(minx), 'minY': round(miny),
                                  'maxX': round(maxx), 'maxY': round(maxy) });
    }
  }
  //console.log(minx_all, maxx_all, miny_all, maxy_all);
  tree_new['bounding-box'] = {'X': round(minx_all)-1, 'Y':round(miny_all)-1,
                              'w':round(maxx_all-minx_all)+2, 'h':round(maxy_all-miny_all)+2};

  if (type == 'number'){
    var start = 0;
    for (var j = 0; j < label.length; j++){
      var step_size = map[label.charAt(j)];
      var minx_list = [], miny_list = [], maxx_list = [], maxy_list = [];
      for (var k = start; k < start + step_size; k++){
        var temp = tree_new['items'][k];
        minx_list.push(temp['minX']);
        maxx_list.push(temp['maxX']);
        miny_list.push(temp['minY']);
        maxy_list.push(temp['maxY']);
      }
      minx = Math.min(...minx_list) - 1;
      maxx = Math.max(...maxx_list) + 1;
      miny = Math.min(...miny_list) - 1;
      maxy = Math.max(...maxy_list) + 1;
      var bbox = {'X':round(minx), 'Y':round(miny), 'w':round(maxx-minx), 'h':round(maxy-miny)};
      tree_new['digits'][j] = {'label':label.charAt(j), 'bbox':bbox};
      start += step_size;
    }
  }

  if ('operands' in tree){
    tree_new['operands'] = {};
    var l = tree['operands'].length;
    for (var i = 0; i < l; i++){
      tree_new['operands'][i] = {};
      custom_export_line(tree['operands'][i], tree_new['operands'][i]);
    }
  }
}

function get_all_bboxes(final_export, bbox_list){
  for (var i = 0; i < Object.keys(final_export).length; i++){
    var line = final_export[i]; // a line in the export
    var label = line['label'];
    if (!label){
      label = '';
    }
    var digits = line['digits'];
    if (digits){
      for (var key in digits){
        bbox_list.push({'bbox':digits[key]['bbox'],
                        'type':'digit',
                        'label':digits[key]['label']});
      }
    } else {
      bbox_list.push({'bbox':line['bounding-box'],
                      'type':line['type'],
                      'label':label})
    }
    if ('operands' in line){
      get_all_bboxes(line['operands'], bbox_list);
    }
  }
}
// in the list of all bounding boxes, we use 'bbox'
// in custom export, we use 'bounding-box'
// the raw export also uses 'bounding-box'


function download(content, fileName, contentType){
  var a = document.createElement('a');
  var file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

function list_to_dict (list){
  var dict = {};
  var l = list.length;
  for (var i = 0; i < l; i++){
    dict[i] = list[i];
  }
  return dict;
}

function dict_to_list(dict){
  var list = [];
  for (var i = 0; i < Object.keys(dict).length; i++){
    list.push(dict[i]);
  }
  return list;
}