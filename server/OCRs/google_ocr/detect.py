import io
import json
from google.cloud import vision
from google.protobuf.json_format import MessageToJson

# detect text
def detect_text(path):
    client = vision.ImageAnnotatorClient()
    with io.open(path, 'rb') as image_file:
        content = image_file.read()
    image = vision.types.Image(content=content)
    response = client.text_detection(image=image)
    #serialized = MessageToJson(response)
    recognized_text = response.full_text_annotation.text
    return recognized_text

    texts = response.text_annotations
    for text in texts:
        print('\n"{}"'.format(text.description))

        vertices = (['({},{})'.format(vertex.x, vertex.y)
                    for vertex in text.bounding_poly.vertices])

        print('bounds: {}'.format(','.join(vertices)))

# detect handwriting (good for dense text)
def detect_document(path):
    client = vision.ImageAnnotatorClient()
    with io.open(path, 'rb') as image_file:
        content = image_file.read()
    image = vision.types.Image(content=content)
    response = client.document_text_detection(image=image)
    #serialized = MessageToJson(response)
    recognized_text = response.full_text_annotation.text
    return recognized_text

    for page in response.full_text_annotation.pages:
        for block in page.blocks:
            print('\nBlock confidence: {}\n'.format(block.confidence))

            for paragraph in block.paragraphs:
                print('Paragraph confidence: {}'.format(
                    paragraph.confidence))

                for word in paragraph.words:
                    word_text = ''.join([
                        symbol.text for symbol in word.symbols
                    ])
                    print('Word text: {} (confidence: {})'.format(
                        word_text, word.confidence))

                    for symbol in word.symbols:
                        print('\tSymbol: {} (confidence: {})'.format(
                            symbol.text, symbol.confidence))


text_detect_result = {}
document_text_detect_result = {}

# process dataset1
for i in range(0, 17):
    image = '../dataset1/' + str(i) + '.png'
    text_detect_result[i] = detect_text(image)
    document_text_detect_result[i] = detect_document(image)
    print(str(i) + " processed!")
with open('dataset1/text_detect.json', 'w') as outfile1:
    json.dump(text_detect_result, outfile1)
with open('dataset1/docu_text_detect.json', 'w') as outfile2:
    json.dump(document_text_detect_result, outfile2)

# process dataset_ocr
for i in range(0, 15):
    image = '../dataset_ocr/context' + str(i) + '.png'
    text_detect_result[i] = detect_text(image)
    document_text_detect_result[i] = detect_document(image)
    print('context' + str(i) + " processed!")
with open('dataset_ocr/text_detect.json', 'w') as outfile1:
    json.dump(text_detect_result, outfile1)
with open('dataset_ocr/docu_text_detect.json', 'w') as outfile2:
    json.dump(document_text_detect_result, outfile2)