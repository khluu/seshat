#!/bin/bash
# first time trying to use shell script...not successful
# instead, run
# cd ~/Documents/MyScriptJS/summer_work/tesseract/dataset_ocr
# tesseract ../../dataset_ocr/context0.png context0 --oem 1 -l eng
# for values from 0 to the last
for fullfile in ../../dataset_ocr/*.png; do
  filename=$(basename -- "$fullfile")
  extension="${filename##*.}"
  onlyname="${filename%.*}"

  part1="~/Documents/MyScriptJS/summer_work/tesseract/dataset_ocr"
  path="$part1/$onlyname"
  echo $path
  tesseract $fullfile $path --oem 1 -l eng
done