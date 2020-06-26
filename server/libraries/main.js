import BezierFit from './bezier_fit.js'
async function run(traces) {
    console.log(traces);
    const model = await tf.loadLayersModel('https://raw.githubusercontent.com/khluu/smartsheet/master/tfjs/model.json');
    console.log('model loaded');
    //console.log(model.getWeights()[0].print());

    /*var a = tf.tensor ([[[ 0.03709199  ,2.0334387,   0.18545994, -0.09037506 , 0.,
   -0.09366621 , 0.       ,   0.06876937 , 1.        ],
  [ 0.22255193 , 1.9430637  , 1.3353115  ,-1.8978761,  -0.15064421,
   -0.02889192 , 1.0254734  , 2.0753584  , 0.        ],
  [ 1.5578635  , 0.04518753 , 0.2596439  , 2.0786264 , -0.51372683,
   -0.83839387 , 0.75317705 , 0.83714885 , 0.        ],
  [ 1.8175074  , 2.1238139  , 1.2982196  ,-1.7171261  ,-0.7888955,
   -0.35728654 , 0.94608957,  0.7986207  , 0.        ],
  [ 3.115727   , 0.40668777 , 0.40801188 , 4.292815  , -0.08566584,
    0.2713467  , 0.41978744 , 1.0644654 ,  0.        ],
  [ 3.5237389  , 4.699503   ,-1.5207715 , -0.13556258,  0.6970405,
    0.98117626 , 0.6625193  , 0.8287222 ,  0.        ],
  [ 2.0029674  , 4.5639405  , 2.7818992 , -2.6660643  , 0.559263,
    0.1951211  , 1.4010531  , 1.3020507 ,  0.        ],
  [ 4.7848663 ,  1.8978761  ,-0.07418398 ,-0.13556258 ,-0.5007144,
   -0.18660872  ,0.08416176  ,0.13198519, -1.        ]]], dtype=tf.float32);*/
    var a = traces;
    console.log(a[0]);
    var fit = new BezierFit(512, traces);
    console.log(fit);
    console.log('check');
    alert(breh);
    //console.log(fit.promise);
    //console.log(fit.promise());
    //b = model.predict(a);
    //console.log(b.argMax().type);
    //var c = b.dataSync();
    //for(i = 0; i < c.length; i++) {
        //console.log(c[i])
    //}
    //document.getElementById("demo").innerHTML = c.length;
}
document.getElementById("clickMe").onclick = predict;
document.getElementById("runMe").onclick = run;

var clear = document.getElementById('clear');
    var canvas = document.getElementById('drawing-canvas');
    var button = document.getElementById('button');
    var undo = document.getElementById('undo');
    var redo = document.getElementById('redo');
    var mode = document.getElementById('mode');

    var render = document.getElementById('eq-render');
    var latex = document.getElementById('eq-latex');
    var tree = document.getElementById('parse-tree');

    var $canvas = $('#drawing-canvas').sketchable({
      graphics: {
        strokesStyle: "red"
      }
    });

    var not_divide_mode = false;
    var bboxes = [];
    var hlines = [];
    var vlines = [];



    undo.onclick = function (e) {
      e.preventDefault();
      $canvas.sketchable('undo');
    }
    redo.onclick = function (e) {
      e.preventDefault();
      $canvas.sketchable('redo');
    }
    clear.onclick = function (e) {
      e.preventDefault();
      $canvas.sketchable('clear');
      console.clear();
      $('.result').empty();
      bboxes = [];
      hlines = [];
      vlines = [];
    }
    mode.onclick = function (e) {
      if (not_divide_mode) {
        not_divide_mode = false;
        mode.innerHTML = "divide mode";
      } else {
        not_divide_mode = true;
        mode.innerHTML = "not divide mode";
      }
    }
    function make_matrix(n,m){
      var matrix = [];
      for(var i=0; i<n; i++) {
          matrix[i] = new Array(m);
      }
      return matrix
    }


    function canvas_arrow(fromx, fromy, tox, toy,color,error_val) {
      context = canvas.getContext("2d")
      var headlen = 10; // length of head in pixels
      var dx = tox - fromx;
      var dy = toy - fromy;
      var angle = Math.atan2(dy, dx);
      context.beginPath();
      context.moveTo(fromx, fromy);
      context.lineTo(tox, toy);
      context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
      context.moveTo(tox, toy);
      context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
      context.strokeStyle = color;
      context.font = "26px Arial";
      context.strokeText(error_val.toFixed(2),tox,toy)
      context.stroke();
      context.strokeStyle = 'purple';
    }

    function fill_first_order_errors(bboxes,matricies){
      for (var i = 0; i < bboxes.length; i++) {
        for (var j = 0; j < bboxes.length; j++) {
          if(i != j){
            b1 = bboxes[i]['bbox']
            b2 = bboxes[j]['bbox']

            h_scale = Math.max(b1.h,b2.h,.6*b1.w,.6*b2.w)
            w_scale = Math.max(b1.w,b2.w,.6*b1.h,.6*b2.h)
            top_diff = (b1.Y - (b2.Y + b2.h))/h_scale
            bot_diff = (b2.Y - (b1.Y + b1.h))/h_scale
            rit_diff = (b2.X  - (b1.X + b1.w))/w_scale
            lft_diff = (b1.X  - (b2.X + b2.w))/w_scale
            centerX_diff = (b1.X+.5*b1.w)-(b2.X+.5*b2.w)
            centerY_diff = (b1.Y+.5*b1.h)-(b2.Y+.5*b2.h)

            vert_sep = -Math.min(1+top_diff,1+bot_diff,0)
            horz_sep = -Math.min(1+lft_diff,1+rit_diff,0)

            matricies["A"][i][j] = Math.max(top_diff - 1.0, 0) + Math.abs(horz_sep) + Math.abs(Math.atan2(centerX_diff,centerY_diff))
            matricies["B"][i][j] = Math.max(bot_diff - 1.0, 0) + Math.abs(horz_sep) + Math.abs(Math.atan2(-centerX_diff,-centerY_diff))
            matricies["R"][i][j] = Math.max(rit_diff - 1.0, 0) + Math.abs(vert_sep) + Math.abs(Math.atan2(-centerY_diff,-centerX_diff))
            matricies["L"][i][j] = Math.max(lft_diff - 1.0, 0) + Math.abs(vert_sep) + Math.abs(Math.atan2(centerY_diff,centerX_diff))


            //console.log(i,j)

            //console.log(Math.atan2(centerX_diff,centerY_diff).toFixed(2))
            //console.log(Math.atan2(-centerX_diff,-centerY_diff).toFixed(2))
            //console.log(Math.atan2(centerY_diff,centerX_diff).toFixed(2))
            //console.log(Math.atan2(-centerY_diff,-centerX_diff).toFixed(2))
            //console.log("right_error",matricies["R"][i][j])
            //console.log("left_error",matricies["L"][i][j])
            //console.log("above_error",matricies["A"][i][j])
            //console.log("below_error",matricies["B"][i][j])
          }else{
            matricies["A"][i][j] = 10000
            matricies["B"][i][j] = 10000
            matricies["L"][i][j] = 10000
            matricies["R"][i][j] = 10000
          }
        }
      }
      // console.log("top_diff",top_diff)
      // console.log("bot_diff",bot_diff)
      // console.log("rit_diff",rit_diff)
      // console.log("lft_diff",lft_diff)
      // console.log("vert_sep",vert_sep)
      // console.log("horz_sep",horz_sep)

    }

    function danny_organize(bboxes){
      //console.log("MOOOOO")
      errors = {};
      errors["A"] = make_matrix(bboxes.length,bboxes.length);
      errors["B"] = make_matrix(bboxes.length,bboxes.length);
      errors["L"] = make_matrix(bboxes.length,bboxes.length);
      errors["R"] = make_matrix(bboxes.length,bboxes.length);

      console.log(errors)

      fill_first_order_errors(bboxes,errors)

      accounted_for = new Set([])


      thresh = 1.0
      for (var i = 0; i < bboxes.length; i++) {
        minA_j = null
        minB_j = null
        minR_j = null
        minL_j = null
        eA_i = 10000
        eB_i = 10000
        eL_i = 10000
        eR_i = 10000
        for (var j = 0; j < bboxes.length; j++) {
          if(i != j){
            eA_ij = errors["A"][i][j]
            eB_ij = errors["B"][i][j]
            eL_ij = errors["L"][i][j]
            eR_ij = errors["R"][i][j]
            if(eA_ij < thresh && eA_ij < eA_i){ eA_i = eA_ij; minA_j = j }
            if(eB_ij < thresh && eB_ij < eB_i){ eB_i = eB_ij; minB_j = j }
            if(eR_ij < thresh && eR_ij < eR_i){ eR_i = eR_ij; minR_j = j }
            if(eL_ij < thresh && eL_ij < eL_i){ eL_i = eL_ij; minL_j = j }
          }
        }
            // var arr = [eA_ij, eB_ij, eL_ij, eR_ij];
        // for (var i = 0; i < bboxes.length; i++) {
            // const min_index = arr.indexOf(Math.min(...arr));
            // if(arr[min_index] < 1.5){
        b1cx = bboxes[i]["bbox"].X + .5*bboxes[i]["bbox"].w
        b1cy = bboxes[i]["bbox"].Y + .5*bboxes[i]["bbox"].h

        if(minA_j != null){
          b2cx = bboxes[minA_j]["bbox"].X + .5*bboxes[minA_j]["bbox"].w
          b2cy = bboxes[minA_j]["bbox"].Y + .5*bboxes[minA_j]["bbox"].h
          canvas_arrow(b1cx+15,b1cy,b2cx+15,b2cy,'red',eA_i)
        }
        if(minB_j != null){
          b2cx = bboxes[minB_j]["bbox"].X + .5*bboxes[minB_j]["bbox"].w
          b2cy = bboxes[minB_j]["bbox"].Y + .5*bboxes[minB_j]["bbox"].h
          canvas_arrow(b1cx-15,b1cy,b2cx-15,b2cy,'green',eB_i)
        }
        if(minR_j != null){
          b2cx = bboxes[minR_j]["bbox"].X + .5*bboxes[minR_j]["bbox"].w
          b2cy = bboxes[minR_j]["bbox"].Y + .5*bboxes[minR_j]["bbox"].h
          canvas_arrow(b1cx,b1cy+15,b2cx,b2cy+15,'blue',eR_i)
        }
        if(minL_j != null){
          b2cx = bboxes[minL_j]["bbox"].X + .5*bboxes[minL_j]["bbox"].w
          b2cy = bboxes[minL_j]["bbox"].Y + .5*bboxes[minL_j]["bbox"].h
          canvas_arrow(b1cx,b1cy-15,b2cx,b2cy-15,'orange',eL_i)
        }


            // }
          // }
        // }
      }
    }

    // function Above_Prototype(){

    // }
    // function Below_Prototype(){

    // }

    // function Right_Prototype(){

    // }

    // function Left_Prototype(){

    // }
    function structure_relative(bboxes){
      console.log(bboxes)
      hlines = [];
      get_horizontal(bboxes, hlines, 0.5);
      console.log("HORIZONTAL: ");
      console.log(hlines, bboxes);

      vlines = [];
      get_vertical(bboxes, hlines, vlines);
      console.log("VERTICAL: ");
      console.log(vlines, bboxes);

      console.log("DANNY: ");
      danny_lines = []
      danny_organize(bboxes)
    }


    function sendMsg(scg,bboxes) {
      latex.innerHTML = ''
      return $.ajax({
        url: '/ajax',
        async: true,
        type: 'POST',
        data: JSON.stringify(scg),
        success: function (data) {
          console.log("\nRequest resolved!");
          data_obj = JSON.parse(data);

          latex.innerHTML += data_obj['latex'] + "<br />";

          var render_list = latex.innerHTML.split('<br>');
          var render_string = '';
          for (var i = 0; i < render_list.length - 1; i++) {
            render_string += ('\\[' + render_list[i] + '\\]');
          }
          render.innerHTML = render_string;
          MathJax.Hub.Typeset();

          //console.log(JSON.stringify(data_obj['tree'], null, 2));
          tree.innerHTML = 'See the result(s) in the console.';

          // analyze the bboxes of the symbols

          get_bboxes_from_symbols(data_obj['tree'], bboxes);
          console.log("\nbboxes of the symbols: ")
          console.log(bboxes);


        },
        error: function () {
          console.log("Request not sent or not resolved.");
        }
      });
    }

    button.addEventListener('click', function () {

      var strokes = $canvas.sketchable('strokes');
      //console.log("BBBBB")
      var a = '';
      for(i = 0; i < strokes[0].length; i++) {
        //console.log(strokes[0][i])
        a = a + strokes[0][i][0].toString() + ' ' + strokes[0][i][1].toString() + '| \n'
      }
      document.getElementById("demo").innerHTML = a;
      //init();
      //run();
      // filter out time and pressure information, only leave coordinate pairs
      for (var i = 0; i < strokes.length; i++) {
        for (var j = 0, stroke = strokes[i]; j < stroke.length; j++) {
          strokes[i][j] = [strokes[i][j][0], strokes[i][j][1]];
        }
      }
      //console.log(strokes)
      run(strokes);
      bboxes = []
      if (not_divide_mode) {
        var scg = strokesToScg(strokes);
        sendMsg(scg,bboxes);
      } else {
        var bboxes = get_bboxes_from_strokes(strokes);
        var strokes_groups = [];

        divideStrokes(bboxes, strokes_groups, 0.6, 0.7);
        //console.log('strokes groups (in indices): ');
        //console.log(JSON.stringify(strokes_groups));

        reqs = []
        bboxes = []
        for (var j = 0; j < strokes_groups.length; j++) {
          var strokes_gj = []; // strokes group j
          for (var box of strokes_groups[j]) {
            strokes_gj.push(strokes[box]);
          }
          var scg_gj = strokesToScg(strokes_gj);
          reqs.push(sendMsg(scg_gj,bboxes));
        }
        console.log(bboxes)
        $.when(...reqs).done(()=>{
          console.log("MOOOOOOOO")
          console.log(bboxes)
          structure_relative(bboxes)
        })
      }
    });
