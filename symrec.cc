/*Copyright 2014 Francisco Alvaro

 This file is part of SESHAT.

    SESHAT is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SESHAT is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SESHAT.  If not, see <http://www.gnu.org/licenses/>.
*/
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <algorithm>
#include <map>
#include <climits>
#include <cfloat>
#include "symrec.h"

// using std::array;  
// using std::vector;


#define TSIZE 2048
#define n_best 10
#define max_strokes 4
#define distance_th 0.69474973

SymRec::SymRec(char *config) {
  FILE *fd=fopen(config, "r");
  if( !fd ) {
    fprintf(stderr, "Error: loading config file '%s'\n", config);
    exit(-1);
  }

  //RNN classifier configuration
  char  RNNon[TSIZE],    RNNoff[TSIZE];
  char  RNNmavON[TSIZE], RNNmavOFF[TSIZE];
  
  char id[TSIZE], info[TSIZE], path[TSIZE];

  RNNon[0] = RNNoff[0] = RNNmavON[0] = RNNmavOFF[0] = 0;
  path[0] = 0;
  RNNalpha=-1.0;
  
  while( !feof(fd) ) {
    fscanf(fd, "%s", id);   //Field id
    fscanf(fd, "%s", info); //Info
    
    //Remove the last \n character
    if( info[strlen(info)-1] == '\n' )
      info[strlen(info)-1] = '\0';
    
    if(      !strcmp(id,"RNNon") )       strcpy(RNNon,     info);
    else if( !strcmp(id,"RNNoff") )      strcpy(RNNoff,    info);
    else if( !strcmp(id,"RNNmavON") )    strcpy(RNNmavON,  info);
    else if( !strcmp(id,"RNNmavOFF") )   strcpy(RNNmavOFF, info);
    else if( !strcmp(id,"RNNalpha")  )   RNNalpha = atof(info);
    else if( !strcmp(id,"SymbolTypes") ) strcpy(path, info);
  }
  
  if( RNNalpha <= 0.0 || RNNalpha >= 1.0 ) {
    fprintf(stderr, "Error: loading config file '%s': must be 0 < RNNalpha < 1\n", config);
    exit(-1);
  }
  if( RNNon[0] == 0 ) {
    fprintf(stderr, "Error: loading RNNon in config file\n");
    exit(-1);
  }
  if( RNNoff[0] == 0 ) {
    fprintf(stderr, "Error: loading RNNoff in config file\n");
    exit(-1);
  }
  if( RNNmavON[0] == 0 ) {
    fprintf(stderr, "Error: loading RNNmavON in config file\n");
    exit(-1);
  }
  if( RNNmavOFF[0] == 0 ) {
    fprintf(stderr, "Error: loading RNNmavOFF in config file\n");
    exit(-1);
  }

  //Close config file
  fclose( fd );

  //Load symbol types info
  FILE *tp = fopen(path, "r");
  if( !tp ) {
    fprintf(stderr, "Error: loading SymbolTypes file '%s'\n", path);
    exit(-1);
  }

  //Number of classes
  fscanf(tp, "%d", &C); getc(tp);

  key2cl = new string[C];
  type   = new int[C];
  char clase[256], T=0, linea[256]; // aux[256];

  //Load classes and symbol types
  int idclase=0;
  while( fgets(linea, 256, tp) != NULL ) {
    for(int i=0; linea[i] && linea[i] != '\n'; i++) {
      clase[i] = linea[i];
      if( linea[i]==' ' ) {
	clase[i] = 0;
	T = linea[i+1];
	break;
      }
    }

    key2cl[idclase] = clase;
    cl2key[clase] = idclase;
    idclase++;
    
    if( T=='n' )       type[ cl2key[clase] ] = 0; //Centroid
    else if( T=='a' )  type[ cl2key[clase] ] = 1; //Ascender
    else if( T=='d' )  type[ cl2key[clase] ] = 2; //Descender
    else if( T=='m' )  type[ cl2key[clase] ] = 3; //Middle
    else {
      fprintf(stderr, "SymRec: Error reading symbol types\n");      
      exit(-1);
    }
  }

  //Features extraction
  FEAS = new SymFeatures(RNNmavON, RNNmavOFF);
  
  //Create and load BLSTM models
  
  //Online info
  ConfigFile conf_on(RNNon);
  header_on.targetLabels = conf_on.get_list<string>("targetLabels");
  header_on.inputSize    = conf_on.get<int>("inputSize");
  header_on.outputSize   = header_on.targetLabels.size();
  header_on.numDims      = 1;

  //Create WeightContainer online
  wc_on = new WeightContainer( &deh_on );

  //Load online BLSTM
  blstm_on = new MultilayerNet(cout, conf_on, header_on, wc_on, &deh_on);

  //build weight container after net is created
  wc_on->build();
  
  //build the network after the weight container
  blstm_on->build();
  
  //create trainer
  Trainer trainer_on(cout, blstm_on, conf_on, wc_on, &deh_on);
  if (conf_on.get<bool>("loadWeights", false))
    deh_on.load(conf_on, cout);

  //Offline info
  ConfigFile conf_off(RNNoff);
  
  //Check if the targetLabels are the same for both online and offline RNN-BLSTM
  vector<string> aux = conf_off.get_list<string>("targetLabels");
  if( aux.size() != header_on.targetLabels.size() ) {
    fprintf(stderr, "Error: Target labels of online and offline symbol classifiers do not match\n");
    exit(-1);
  }

  for(vector<string>::iterator it1=aux.begin(), it2=header_on.targetLabels.begin();
      it1!=aux.end() && it2!=header_on.targetLabels.end(); it1++, it2++) {
    if( (*it1).compare( *it2 ) ) {
      fprintf(stderr, "Error: Target labels of online and offline symbol classifiers do not match\n");
      exit(-1);
    }
  }

  header_off.targetLabels = conf_off.get_list<string>("targetLabels");
  header_off.inputSize    = conf_off.get<int>("inputSize");
  header_off.outputSize   = header_off.targetLabels.size();
  header_off.numDims      = 1;

  //Create WeightContainer offline
  wc_off = new WeightContainer( &deh_off );

  //Load offline BLSTM
  blstm_off = new MultilayerNet(cout, conf_off, header_off, wc_off, &deh_off);

  //build weight container after net is created
  wc_off->build();

  //build the network after the weight container
  blstm_off->build();

  //create trainer
  Trainer trainer_off(cout, blstm_off, conf_off, wc_off, &deh_off);
  if (conf_off.get<bool>("loadWeights", false))
    deh_off.load(conf_off, cout);
}

SymRec::~SymRec() {
  delete FEAS;
  delete[] type;
  delete[] key2cl;
  delete blstm_on;
  delete blstm_off;
  delete wc_on;
  delete wc_off;
}

char *SymRec::strClase(int c) {
  return (char *)(key2cl[c]).c_str();
}

int SymRec::keyClase(char *str) {
  if( cl2key.find(str) == cl2key.end() ) {
    fprintf(stderr, "WARNING: Class '%s' doesn't appear in symbols database\n", str);
    return -1;
  }
  return cl2key[str];
}

bool SymRec::checkClase(char *str) {
  if( cl2key.find(str) == cl2key.end() )
    return false;
  return true;
}

int SymRec::getNClases() {
  return C;
}

//Returns the type of symbol of class k
int SymRec::symType(int k) {
  return type[k];
}


/************
 * Classify *
 ************/
// void c_classify_simple(double *points, int n_strokes, int n_classes){
//   SymRec symrec;
//   Sample *M = new Sample(points, n_strokes);
//   symrec.classify_simple(M,n_classes);
//   // for(int s=0; s<n_strokes; s++){
//   //   double n_pts = points[0];
//   //   for(int i=0; i<n_pts;i++){

//   //   }
//   // }
// }

vector<string> SymRec::getSymbolStrings(){
  vector<string> out;
  for(int i=0; i < C; i++){
    out.push_back(key2cl[i]);
  }
  return out;
}

std::tuple<vector<int>, vector<int>, vector<float>> SymRec::classify_simple(Sample *M,int n_classes, list<list<int>>* only_hyps){
  // const int n_classes = n_best;
  // int classes_out[n_classes];
  // float probs_out[n_classes];
  int N = M->nStrokes();

  vector<int> hypotheses_out;
  vector<int> classes_out;
  vector<float> probs_out;
  vector<pair<std::array<int, max_strokes>, int>> hypotheses;
  int h_count = 0;
  // printf("START\n");
  // if( N<=1 ) return;
  if(only_hyps != NULL){
    for(list<list<int>>::iterator it1=only_hyps->begin(); it1!=only_hyps->end(); it1++){
      std::array<int, max_strokes> s0_ids;
      int i=0;
      for(list<int>::iterator it2=it1->begin(); it2!=it1->end(); it2++){
        s0_ids[i++] = *it2;
        if(i > max_strokes) break;
      }
      hypotheses.push_back(std::make_pair(s0_ids,i)); 
    }
        
  }else{
    for(int stkc1=0; stkc1<N; stkc1++) {
      std::array<int, max_strokes> s1_ids;
      s1_ids[0] = stkc1;
      hypotheses.push_back(std::make_pair(s1_ids,1));

      for(int size=2; size<=min(max_strokes,N); size++) {
        list<int> close_list;

        //Add close and visible strokes to the closer list
        if( size==2 ) {
          for(int i=0; i<stkc1; i++){
            if( M->getDist(stkc1, i) < distance_th ){
              close_list.push_back(i);
            }
          }
        }else{
          M->get_close_strokes( stkc1, &close_list, distance_th );      
        }

        //If there are not enough strokes to compose a hypothesis of "size", continue
        if( (int)close_list.size() < size-1 ) continue;

        int stkvec [close_list.size()];
        int VS=0;
        for(list<int>::iterator it=close_list.begin(); it!=close_list.end(); it++){
          stkvec[VS++] = *it;
        }
        
        sort(stkvec, stkvec+VS);

        for(int i=size-2; i<VS; i++) {
          std::array<int, max_strokes> s_ids;
          s_ids[0] = stkvec[i];
          s_ids[1] = stkc1;
          
          //Add strokes up to size
          int k = 2;
          for(int j=i-(size-2); j<i; j++)
            s_ids[k++] = stkvec[j];
          
          //Sort list (stroke's order is important in online classification)
          sort(s_ids.begin(),s_ids.begin() + k);
          hypotheses.push_back(std::make_pair(s_ids,k));
        }
        // free(stkvec);
      }
    }
  }
  // #pragma omp parallel for
  for(int i=0; i < hypotheses.size(); i++){
    auto hyp = hypotheses[i];
    
    int c_buff[n_classes];
    float p_buff[n_classes];

    classify_stroke_hypothesis(M, hyp.first.data(), hyp.second, n_classes, c_buff, p_buff);

    hypotheses_out.push_back(hyp.second);
    for(int j=0; j < hyp.second; j++){
      hypotheses_out.push_back(hyp.first[j]);
    }
    for(int j=0; j < n_classes; j++){
      probs_out.push_back(p_buff[j]);
      classes_out.push_back(c_buff[j]);
    }
    // printf("hypothesis: {");
    // for(int j=0; j<hyp.second;j++){
    //   printf(" %d", hyp.first[j]); 
    //   //Print hypothesis information
    // }
    // printf(" }\n");
    // for(int j=0; j<n_classes; j++) {
    //   // if( cd->noterm[j] ) {
    //     printf("%12s %g\n", strClase(c_buff[j]), p_buff[j]);
    //   // }
    // }
  }
  return make_tuple(hypotheses_out,classes_out,probs_out);
}

void SymRec::classify_stroke_hypothesis(Sample *M,
                                        int *stroke_ids,
                                        int n_strokes, 
                                        const int n_classes,
                                        int *classes_out,
                                        float *probs_out){
  SegmentHyp seg_h;

  seg_h.rx = seg_h.ry = INT_MAX;
  seg_h.rs = seg_h.rt = -INT_MAX;

  for(int i=0; i<n_strokes; i++){//list<int>::iterator it=stroke_ids.begin(); it!=stroke_ids.end(); it++) {
    int s_id = stroke_ids[i];
    seg_h.stks.push_back( s_id );

    if( M->getStroke(s_id)->rx < seg_h.rx ) seg_h.rx = M->getStroke(s_id)->rx;
    if( M->getStroke(s_id)->ry < seg_h.ry ) seg_h.ry = M->getStroke(s_id)->ry;
    if( M->getStroke(s_id)->rs > seg_h.rs ) seg_h.rs = M->getStroke(s_id)->rs;
    if( M->getStroke(s_id)->rt > seg_h.rt ) seg_h.rt = M->getStroke(s_id)->rt;
  }
  

  int regy = INT_MAX, regt=-INT_MAX, N=0;

  //First compute the vertical centroid (cen) and the ascendant/descendant centroids (as/ds)
  seg_h.cen=0;
  for(list<int>::iterator it=seg_h.stks.begin(); it!=seg_h.stks.end(); it++) {
    for(int j=0; j<M->getStroke(*it)->getNpuntos(); j++) {
      Punto *p = M->getStroke(*it)->get(j);
  
      if( M->getStroke(*it)->ry < regy )
  regy = M->getStroke(*it)->ry;
      if( M->getStroke(*it)->rt > regt )
  regt = M->getStroke(*it)->rt;
      
      seg_h.cen += p->y;
  
      N++;
    }

  }
  seg_h.cen /= N;
  // *as = (seg_h.cen+regt)/2;
  // *ds = (regy+seg_h.cen)/2;

  //Feature extraction of hypothesis
  DataSequence *feat_on, *feat_off;

  //Online features extraction: PRHLT (7 features)
  feat_on = FEAS->getOnline( M, &seg_h );

  //Render the image representing the set of strokes seg_h->stks
  int **img, Rows, Cols;
  M->renderStrokesPBM(&seg_h.stks, &img, &Rows, &Cols);

  //Offline features extraction: FKI (9 features)
  feat_off = FEAS->getOfflineFKI(img, Rows, Cols);
  
  //cout << feat_off->inputs;

  for(int i=0; i<Rows; i++)
    delete[] img[i];
  delete[] img;

  //n-best classification
  pair<float,int> clason[n_classes], clasoff[n_classes], clashyb[2*n_classes];
    
  for(int i=0; i<n_classes; i++) {
    clason[i].first = 0.0; //probability
    clason[i].second = -1; //class id
    clasoff[i].first = 0.0;
    clasoff[i].second = -1;
    clashyb[i].first = 0.0;
    clashyb[i].second = -1;
  }

  //Online/offline classification
  BLSTMclassification( blstm_on,  feat_on,  clason,  n_classes);
  BLSTMclassification( blstm_off, feat_off, clasoff, n_classes);

  //Online + Offline n-best linear combination
  //alpha * pr(on) + (1 - alpha) * pr(off)
    
  for(int i=0; i<n_classes; i++) {
    clason[i].first  *= RNNalpha;       //online  *    alpha
    clasoff[i].first *= 1.0 - RNNalpha; //offline * (1-alpha)
  }

  int hybnext=0;
  for(int i=0; i<n_classes; i++) {
    if( clason[i].second >= 0 ) {
      
      clashyb[hybnext].first  = clason[i].first;
      clashyb[hybnext].second = clason[i].second;
      
      for(int j=0; j<n_classes; j++)
  if( clason[i].second == clasoff[j].second ) {
    clashyb[hybnext].first += clasoff[j].first;
    break;
  }
      
      hybnext++;
    }
      
    if( clasoff[i].second < 0 ) continue;
    bool found=false;
    for(int j=0; j<n_classes && !found; j++)
      if( clasoff[i].second == clason[j].second )
  found = true;
      
    //Add the (1-alpha) probability if the class is in OFF but not in ON
    if( !found ) {
      clashyb[hybnext].first  = clasoff[i].first;
      clashyb[hybnext].second = clasoff[i].second;
      hybnext++;
    }
  }
    
  sort( clashyb, clashyb+hybnext, std::greater< pair<float,int> >() );
  for(int i=0; i<min(hybnext, n_classes); i++) {
    probs_out[i]    = clashyb[i].first;
    classes_out[i] = clashyb[i].second;
  }
    
  // return seg_h.cen;  

}

int SymRec::clasificar(Sample *M, int ncomp, const int NB, int *vclase, float *vpr, int *as, int *ds) {
  list<int> aux;
  aux.push_back( ncomp );

  return clasificar(M, &aux, NB, vclase, vpr, as, ds);
}

int SymRec::clasificar(Sample *M, list<int> *LT, const int NB, int *vclase, float *vpr, int *as, int *ds) {
  SegmentHyp aux;

  aux.rx = aux.ry = INT_MAX;
  aux.rs = aux.rt = -INT_MAX;

  for(list<int>::iterator it=LT->begin(); it!=LT->end(); it++) {
    aux.stks.push_back( *it );

    if( M->getStroke(*it)->rx < aux.rx ) aux.rx = M->getStroke(*it)->rx;
    if( M->getStroke(*it)->ry < aux.ry ) aux.ry = M->getStroke(*it)->ry;
    if( M->getStroke(*it)->rs > aux.rs ) aux.rs = M->getStroke(*it)->rs;
    if( M->getStroke(*it)->rt > aux.rt ) aux.rt = M->getStroke(*it)->rt;
  }
  
  return classify(M, &aux, NB, vclase, vpr, as, ds);
}

int SymRec::classify(Sample *M, SegmentHyp *seg_h, const int NB, int *vclase, float *vpr, int *as, int *ds) {

  int regy = INT_MAX, regt=-INT_MAX, N=0;

  //First compute the vertical centroid (cen) and the ascendant/descendant centroids (as/ds)
  seg_h->cen=0;
  for(list<int>::iterator it=seg_h->stks.begin(); it!=seg_h->stks.end(); it++) {
    for(int j=0; j<M->getStroke(*it)->getNpuntos(); j++) {
      Punto *p = M->getStroke(*it)->get(j);
	
      if( M->getStroke(*it)->ry < regy )
	regy = M->getStroke(*it)->ry;
      if( M->getStroke(*it)->rt > regt )
	regt = M->getStroke(*it)->rt;
      
      seg_h->cen += p->y;
	
      N++;
    }

  }
  seg_h->cen /= N;
  *as = (seg_h->cen+regt)/2;
  *ds = (regy+seg_h->cen)/2;

  //Feature extraction of hypothesis
  DataSequence *feat_on, *feat_off;

  //Online features extraction: PRHLT (7 features)
  feat_on = FEAS->getOnline( M, seg_h );

  //Render the image representing the set of strokes seg_h->stks
  int **img, Rows, Cols;
  M->renderStrokesPBM(&seg_h->stks, &img, &Rows, &Cols);

  //Offline features extraction: FKI (9 features)
  feat_off = FEAS->getOfflineFKI(img, Rows, Cols);
  
  //cout << feat_off->inputs;

  for(int i=0; i<Rows; i++)
    delete[] img[i];
  delete[] img;

  //n-best classification
  pair<float,int> clason[NB], clasoff[NB], clashyb[2*NB];
    
  for(int i=0; i<NB; i++) {
    clason[i].first = 0.0; //probability
    clason[i].second = -1; //class id
    clasoff[i].first = 0.0;
    clasoff[i].second = -1;
    clashyb[i].first = 0.0;
    clashyb[i].second = -1;
  }

  //Online/offline classification
  BLSTMclassification( blstm_on,  feat_on,  clason,  NB);
  BLSTMclassification( blstm_off, feat_off, clasoff, NB);

  //Online + Offline n-best linear combination
  //alpha * pr(on) + (1 - alpha) * pr(off)
    
  for(int i=0; i<NB; i++) {
    clason[i].first  *= RNNalpha;       //online  *    alpha
    clasoff[i].first *= 1.0 - RNNalpha; //offline * (1-alpha)
  }

  int hybnext=0;
  for(int i=0; i<NB; i++) {
    if( clason[i].second >= 0 ) {
      
      clashyb[hybnext].first  = clason[i].first;
      clashyb[hybnext].second = clason[i].second;
      
      for(int j=0; j<NB; j++)
	if( clason[i].second == clasoff[j].second ) {
	  clashyb[hybnext].first += clasoff[j].first;
	  break;
	}
      
      hybnext++;
    }
      
    if( clasoff[i].second < 0 ) continue;
    bool found=false;
    for(int j=0; j<NB && !found; j++)
      if( clasoff[i].second == clason[j].second )
	found = true;
      
    //Add the (1-alpha) probability if the class is in OFF but not in ON
    if( !found ) {
      clashyb[hybnext].first  = clasoff[i].first;
      clashyb[hybnext].second = clasoff[i].second;
      hybnext++;
    }
  }
    
  sort( clashyb, clashyb+hybnext, std::greater< pair<float,int> >() );
  for(int i=0; i<min(hybnext, NB); i++) {
    vpr[i]    = clashyb[i].first;
    vclase[i] = clashyb[i].second;
  }
    
  return seg_h->cen;
}


void SymRec::BLSTMclassification( Mdrnn *net, DataSequence *seq, pair<float,int> *claspr, const int NB ) {
  //Classify sample with net
  net->train(*seq);

  //Get output layer and its shape
  Layer *L = (Layer*)net->outputLayers.front();
  int NVEC=L->outputActivations.shape[0];
  int NCLA=L->outputActivations.shape[1];
  
  pair<float,int> *prob_class = new pair<float,int>[NCLA];
  for(int i=0; i<NCLA; i++)
    prob_class[i].second = cl2key[ header_on.targetLabels[i] ]; //targetLabels on = targetLabels off
  
  for(int i=0; i<NCLA; i++)
    prob_class[i].first = 0.0;
  
  //Compute the average posterior probability per class
  for(int nvec=0; nvec<NVEC; nvec++)
    for(int ncla=0; ncla<NCLA; ncla++)
      prob_class[ncla].first += L->outputActivations.data[nvec*NCLA + ncla];
  
  for(int ncla=0; ncla<NCLA; ncla++)
    prob_class[ncla].first /= NVEC;

  //Sort classification result by its probability
  sort(prob_class, prob_class+NCLA, std::greater< pair<float,int> >());
  
  //Copy n-best to output vector
  for(int i=0; i<NB; i++)
    claspr[i] = prob_class[i];

  delete[] prob_class;
}
