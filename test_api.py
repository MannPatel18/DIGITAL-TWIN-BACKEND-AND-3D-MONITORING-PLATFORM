import urllib.request
import json
import os

def upload_file(url, file_path, filename):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: image/jpeg\r\n\r\n'
    ).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# Test with images (13).jpeg on DECK_MIDSPAN
url_deck = "http://127.0.0.1:8000/api/inspect/DECK_MIDSPAN"
img_path = r"C:\Users\patel\.gemini\antigravity\scratch\bridge-digital-twin\backend\app\static\uploads\temp_images (13).jpeg"
res = upload_file(url_deck, img_path, "images (13).jpeg")
print("\n--- TEST: images (13).jpeg (Green Clean Painted Wall) ---")
print("Prediction:     ", res["inspection"]["damageType"])
print("Severity:       ", res["inspection"]["severity"])
print("Confidence:     ", f"{res['inspection']['confidence']*100:.1f}%")
print("Crack Length:   ", res["inspection"]["crackLengthMm"], "mm")
print("Defect Area:    ", res["inspection"]["defectAreaCm2"], "cm²")
print("Updated Deck Health:", res["updatedComponentHealth"]["health_score"], "/ 100")
