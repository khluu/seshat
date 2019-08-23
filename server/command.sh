./seshat -c Config/CONFIG -i canvas/input0.scgink -o canvas/out0.inkml -r canvas/out0.pgm -d canvas/out0.dot

./seshat -c Config/CONFIG -i canvas/input0.scgink -d canvas/out0.dot

dot -o canvas/out0.ps canvas/out0.dot -Tps