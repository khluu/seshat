var editorElement = document.getElementById('editor');
var resultElement = document.getElementById('result');

var undoElement = document.getElementById('undo');
var redoElement = document.getElementById('redo');
var eraseElement = document.getElementById('erase');
var clearElement = document.getElementById('clear');

var uploadElement = document.getElementById('upload');
var downloadElement = document.getElementById('download');

var convertElement = document.getElementById('convert');
var exportElement = document.getElementById('exportContent');

// global variables
var strokes_history_loads = {};
var strokes_history = {};
var boxes_history = {};
var strokes_index = 0;

var save_strokes = true;
var save_bboxes = true;

function cleanLatex(latexExport) {
  if (latexExport.includes('\\\\')) {
    const steps = '\\begin{align*}' + latexExport + '\\end{align*}';
    return steps.replace("\\overrightarrow", "\\vec")
      .replace("\\begin{aligned}", "")
      .replace("\\end{aligned}", "")
      .replace("\\llbracket", "\\lbracket")
      .replace("\\rrbracket", "\\rbracket")
      .replace("\\widehat", "\\hat")
      .replace(new RegExp("(align.{1})", "g"), "aligned");
  }
  return latexExport
    .replace("\\overrightarrow", "\\vec")
    .replace("\\llbracket", "\\lbracket")
    .replace("\\rrbracket", "\\rbracket")
    .replace("\\widehat", "\\hat")
    .replace(new RegExp("(align.{1})", "g"), "aligned");
}

editorElement.addEventListener('changed', function (event) {
  //console.log(event.detail.canExport);
  undoElement.disabled = !event.detail.canUndo;
  redoElement.disabled = !event.detail.canRedo;
  eraseElement.disabled = event.detail.isEmpty;
  exportElement.disabled = !event.detail.canExport;
});

// Undo a stroke
undoElement.onclick = function () {
  editorElement.editor.undo();
  var pop = strokes_list.pop();
  strokes_reverted.unshift(pop);
  //console.log("LOG: Undo successful.");
};

// Redo a stroke
redoElement.onclick = function () {
  editorElement.editor.redo();
  var pop = strokes_reverted.pop();
  strokes_list.push(pop);
  //console.log("LOG: Redo successful.");
};

// Erase current stokes in the editor
eraseElement.onclick = function () {
  editorElement.editor.clear();
  strokes_list = [];
  strokes_reverted = [];
  //console.log("LOG: Erase successful.");
};

// Clear strokes_history and Erase
clearElement.onclick = function () {
  editorElement.editor.clear();
  strokes_list = [];
  strokes_reverted = [];
  strokes_history = {};
  boxes_history = {};
  n = 0;
  //console.log("LOG: Clear successful.");
};

// Download strokes_history
downloadElement.onclick = function () {
  download(JSON.stringify(strokes_history), 'strokes_history.json', 'application/json');
  console.log("strokes_history.json downloaded successfullly.");
  // or use 'text/plain'
  download(JSON.stringify(boxes_history), 'boxes_history.json', 'application/json');
  console.log("boxes_history.json downloaded successfully.");
};

uploadElement.onclick =  function () {
  clearElement.click();
  var input = document.getElementById('fileinput');
  var file = input.files[0];
  var fr = new FileReader();
  fr.onload = receivedText;
  fr.readAsText(file);
  console.log("Log: uploaded.");
  upload_mode = true;

  function receivedText(e){
    strokes_history_loads = JSON.parse(e.target.result);
    strokes_history_loads['-1'] = strokes_history_loads['0'];
    strokes_index = -1;
    //Object.keys(strokes_history_loads).length
    /*for (var i = 0; i < Object.keys(strokes_history_loads).length; i++){
      var strokes = dict_to_list(strokes_history_loads[i]);
      editorElement.editor.pointerEvents({"events":strokes}); // this line loads the strokes into
                                                              // the editor/canvas
      strokes_list = strokes;
      //alert("Continue to next set of strokes?");
      // attempted to simulate clicking the export button, but didnt work
      exportElement.click();
      window.setTimeout(function(){
        console.log('time');
        exportElement.click();
      }, 200); // need to wait for at least 150ms. During the time the data is exchanged between
               // client and server.
      window.setTimeout(function(){
        strokesElement.click();
      }, 500);
      window.setTimeout(function(){
        eraseElement.click();
      }, 1000);
      console.log("did last one")
      break;*/
    }
  };

// After exportElement, the event "exported" happens
function exported(evt, save_strokes, save_bboxes){
  const exports = evt.detail.exports;

  if (exports && exports['application/x-latex']) {
    convertElement.disabled = false;
    katex.render(cleanLatex(exports['application/x-latex']), resultElement);
  }

  if (exports && exports['application/vnd.myscript.jiix']) {
    result = JSON.parse(exports['application/vnd.myscript.jiix']);
    //console.log("Raw export: ");
    //console.log(result.expressions);

    var custom_export = {};
    for (var i = 0; i < result.expressions.length; i++){ // for each line
      var tree_new = {}; // custom export line
      custom_export_line(result.expressions[i], tree_new);
      custom_export[i] = tree_new;
    }
    console.log("Custom export: ");
    console.log(custom_export);

    var all_bboxes = [];
    get_all_bboxes(custom_export, all_bboxes);
    console.log("All bounding boxes: ")
    console.log(all_bboxes);

    var index = strokes_index - 1; // the last index of the strokes sent to the server
    if (save_strokes && index != -1){
      strokes_history[index] = strokes_list;
      //console.log("LOG: Strokes added successfully.");
      //console.log(strokes_list);
    }
    if (save_bboxes && index != -1){
      boxes_history[index] = all_bboxes;
      //console.log("LOG: bboxes added successfully.");
      //console.log(all_bboxes);
    }
    console.log("LOG: export is successful.");
  }
}

editorElement.addEventListener('exported', function(evt){
  exported(evt, save_strokes, save_bboxes);
});

// Export
exportElement.onclick = function () {
  var l = Object.keys(strokes_history_loads).length;
  if (l != 0 && strokes_index < l-1){
    eraseElement.click();
    strokes_list = strokes_history_loads[strokes_index];
    console.log("\nIndex: ", strokes_index);
    editorElement.editor.pointerEvents({"events":strokes_list});
  }
  editorElement.editor.export_();
  strokes_index++;
};

// Convert
convertElement.onclick = function () {
  editorElement.editor.convert();
};

/**
 * Attach an editor to the document
 * @param {Element} The DOM element to attach the ink paper
 * @param {Object} The recognition parameters
 */

MyScript.register(editorElement, Configuration);

window.addEventListener('resize', function () {
  editorElement.editor.resize();
});