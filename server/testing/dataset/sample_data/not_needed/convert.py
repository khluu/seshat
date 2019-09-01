import json

with open('strokes_raw.json', 'r') as f:
  strokes_data = json.load(f);

new_data = {}

for key in strokes_data:
  new_data[key] = []
  for stroke in strokes_data[key]:
    new_data[key].append([[stroke['x'][i], stroke['y'][i]] for i in range(0, len(stroke['x']))])

with open('strokes.json', 'w') as f:
  json.dump(new_data, f)