from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image
import mediapipe as mp
import os
import requests
import time

# Flask app 설정
app = Flask(__name__)
CORS(app)

# Mediapipe 초기화
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True)

# 네이버 API 정보
NAVER_CLIENT_ID = "lBn8efDv2ADZj1HAtP94"
NAVER_CLIENT_SECRET = "yD8do1gkuj"

# 얼굴 특징 추출
def extract_face_features(image_data):
    img = Image.open(image_data).convert("RGB")
    img_np = np.array(img, dtype=np.uint8)
    img_rgb = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

    results = face_mesh.process(img_rgb)
    if results.multi_face_landmarks is None:
        return "No face detected", None

    face_landmarks = results.multi_face_landmarks[0]
    features = [(landmark.x, landmark.y, landmark.z) for landmark in face_landmarks.landmark]
    return None, features

# 얼굴형 판단
def determine_face_shape(jaw_width, face_height, forehead_width, cheekbone_width):
    aspect_ratio = face_height / cheekbone_width
    if aspect_ratio > 1.4 and forehead_width > jaw_width:
        return "Oval"
    elif aspect_ratio <= 1.3 and abs(cheekbone_width - face_height) < 20:
        return "Round"
    elif aspect_ratio >= 1.6:
        return "Oblong"
    elif abs(jaw_width - cheekbone_width) < 15 and abs(cheekbone_width - forehead_width) < 15:
        return "Square"
    elif jaw_width > cheekbone_width > forehead_width:
        return "Triangle"
    elif cheekbone_width > forehead_width and cheekbone_width > jaw_width:
        return "Diamond"
    elif forehead_width > cheekbone_width > jaw_width:
        return "Heart"
    else:
        if aspect_ratio > 1.5:
            return "Oblong"
        elif aspect_ratio < 1.3:
            return "Round"
        else:
            return "Oval"

# 얼굴형 스타일 추천
def recommend_style(face_shape):
    recommendations = {
        "Oval": {
            "hairstyle": ["모든 스타일이 어울리지만, 얼굴선을 살리는 레이어드 컷 추천."],
            "glasses": ["어떤 안경도 잘 어울리나, 살짝 둥근 프레임이 자연스러움."],
            "hat": ["중절모(Fedora)나 비니(Beanie) 추천."]
        },
        "Round": {
            "hairstyle": ["볼륨을 살린 스타일, 긴 머리 추천. 짧은 머리는 피하는 것이 좋음."],
            "glasses": ["각진 프레임 추천 (스퀘어, 직사각형)."],
            "hat": ["챙이 넓은 모자가 얼굴을 더 갸름하게 보이게 함."]
        },
        "Oblong": {
            "hairstyle": ["앞머리가 있는 스타일 추천. 너무 긴 머리는 피하는 것이 좋음."],
            "glasses": ["넓고 둥근 프레임 추천."],
            "hat": ["챙이 짧은 모자 추천."]
        },
        "Square": {
            "hairstyle": ["부드러운 곡선의 웨이브 스타일 추천."],
            "glasses": ["둥근 프레임 추천 (오벌, 라운드 안경)."],
            "hat": ["챙이 둥근 모자 추천."]
        },
        "Triangle": {
            "hairstyle": ["볼륨 있는 윗머리 스타일 추천 (포마드, 레이어드 컷)."],
            "glasses": ["넓은 프레임이 얼굴 균형을 맞춰줌."],
            "hat": ["이마를 강조하는 스타일 추천."]
        },
        "Diamond": {
            "hairstyle": ["부드러운 곡선 스타일 추천. 앞머리를 내리는 스타일도 잘 어울림."],
            "glasses": ["타원형 프레임 추천."],
            "hat": ["챙이 살짝 휘어진 모자 추천."]
        },
        "Heart": {
            "hairstyle": ["턱 라인을 보완하는 스타일 추천."],
            "glasses": ["밑부분이 넓은 프레임 추천."],
            "hat": ["챙이 넓은 모자 추천."]
        }
    }

    return recommendations.get(face_shape, {
        "hairstyle": ["기본 스타일 추천."],
        "glasses": ["기본 스타일 추천."],
        "hat": ["기본 스타일 추천."]
    })

# 얼굴형 기반 추천
def recommend_clothes(face_features):
    if not face_features:
        return "No face detected", {}
    
    # 여기는 적절히 수정해주는 것이 좋음
    landmarks = face_features

    # 단순한 예시 수치로 계산
    jaw_width = landmarks[16][0] - landmarks[0][0]
    face_height = landmarks[8][1] - landmarks[27][1]
    forehead_width = landmarks[26][0] - landmarks[17][0]
    cheekbone_width = landmarks[14][0] - landmarks[2][0]

    face_shape = determine_face_shape(jaw_width, face_height, forehead_width, cheekbone_width)
    recommended_style = recommend_style(face_shape)
    return face_shape, recommended_style

# 체형 분석
def analyze_body_shape(image_np):
    # 1) Pose 랜드마크 획득
    results = pose.process(cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR))
    if not results.pose_landmarks:
        return None
    lm = results.pose_landmarks.landmark

    # 2) normalized 좌표 차이로 폭/길이 계산
    shoulder = abs(lm[mp_pose.PoseLandmark.LEFT_SHOULDER].x  - lm[mp_pose.PoseLandmark.RIGHT_SHOULDER].x)
    hip      = abs(lm[mp_pose.PoseLandmark.LEFT_HIP].x       - lm[mp_pose.PoseLandmark.RIGHT_HIP].x)
    waist    = abs(lm[mp_pose.PoseLandmark.LEFT_HIP].x       - lm[mp_pose.PoseLandmark.LEFT_SHOULDER].x)
    torso    = abs(lm[mp_pose.PoseLandmark.LEFT_SHOULDER].y  - lm[mp_pose.PoseLandmark.LEFT_HIP].y)
    leg      = abs(lm[mp_pose.PoseLandmark.LEFT_HIP].y       - lm[mp_pose.PoseLandmark.LEFT_ANKLE].y)

    # 3) 주요 비율 계산
    r_sh = shoulder / hip      if hip      > 0 else 0   # 어깨/엉덩이
    r_ws = waist   / shoulder if shoulder > 0 else 0   # 허리/어깨
    r_wh = waist   / hip      if hip      > 0 else 0   # 허리/엉덩이
    r_tl = torso   / leg      if leg      > 0 else 0   # 토르소/다리

    # 4) 우선순위 분류 (요청한 3가지 케이스)
    if r_ws < 0.05:
        return "Hourglass"            # 3번째 사진
    elif r_tl > 0.7:
        return "Apple"                # 2번째 사진
    elif r_sh > 1.5:
        return "Inverted Triangle"    # 1번째 사진

    # 5) 나머지 원래 체형들 분류
    if r_sh <= 0.8:
        return "Pear"
    elif abs(r_sh - 1) <= 0.1 and r_ws <= 0.8:
        return "Hourglass"
    elif abs(r_sh - 1) <= 0.1 and 0.8 < r_ws <= 1.1:
        return "Rectangle"
    elif r_wh >= 1.1 and 0.8 < r_sh < 1.2:
        return "Lollipop"
    elif abs(r_sh - 1) <= 0.2 and 0.8 < r_wh < 1.1:
        return "Diamond"
    elif r_tl >= 1.1:
        return "Oval"
    else:
        return "Undefined"

    
def recommend_body_style(body_shape):
    recommendations = {
        "Inverted Triangle": {
            "tops": ["심플한 상의", "브이넥 티셔츠", "어두운 컬러 블라우스"],
            "bottoms": ["밝은 색 하의", "플레어 스커트", "와이드 팬츠"]
        },
        "Apple": {
            "tops": ["랩 블라우스", "엠파이어 웨이스트 원피스", "브이넥 롱 가디건"],
            "bottoms": ["하이웨이스트 스트레이트 진", "A라인 미디 스커트", "슬림 테이퍼드 팬츠"]
        },
        "Pear": {
            "tops": ["퍼프 소매 블라우스", "숄더 디테일 탑", "밝은 색 셔츠"],
            "bottoms": ["어두운 색 하이웨이스트 팬츠", "A라인 스커트", "일자핏 팬츠"]
        },
        "Rectangle": {
            "tops": ["벨트로 허리를 강조한 재킷", "레이어드 탑", "프릴 블라우스"],
            "bottoms": ["플리츠 스커트", "하이라이즈 팬츠", "루즈핏 팬츠"]
        },
        "Hourglass": {
            "tops": ["크롭탑", "슬림핏 블라우스", "랩 탑"],
            "bottoms": ["머메이드 스커트", "슬림핏 팬츠", "타이트 스커트"]
        },
        "Oval": {
            "tops": ["길이가 긴 튜닉", "스트레이트 실루엣 탑", "헨리넥 상의"],
            "bottoms": ["스트레이트 팬츠", "롱스커트", "조거 팬츠"]
        },
        "Lollipop": {
            "tops": ["어깨선이 강조되지 않은 탑", "간결한 디자인의 상의", "스퀘어넥 블라우스"],
            "bottoms": ["A라인 스커트", "볼륨감 있는 하의", "밑단 디테일이 있는 팬츠"]
        },
        "Diamond": {
            "tops": ["목선을 강조하는 상의", "랩 블라우스", "어깨 패드 있는 자켓"],
            "bottoms": ["밑단 넓은 팬츠", "스트레이트 스커트", "밝은 컬러 하의"]
        }
    }
    return recommendations.get(body_shape, {
        "tops": ["기본 스타일 추천."],
        "bottoms": ["기본 스타일 추천."]
    })

# 네이버 상품 API 검색
def get_clothes_by_price_range(min_price, max_price, body_style, purpose, gender):

    url = "https://openapi.naver.com/v1/search/shop.json"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }

    queries = {
        "tops": body_style.get("tops", []),
        "bottoms": body_style.get("bottoms", [])
    }

    results = []

    for category, items in queries.items():
        for base_query in items:
            query = f"{purpose} {base_query}" if purpose else base_query
            query = f"{gender} {base_query}" if gender else base_query
            start = 1
            matched_item = None

            while start <= 50:  
                params = {
                    "query": query,
                    "start": start,
                    "display": 1
                }

                response = requests.get(url, headers=headers, params=params)

                try:
                    item_list = response.json().get("items", [])
                    if not item_list:
                        break  # 더 이상 상품이 없으면 종료

                    item = item_list[0]
                    price = int(item.get("lprice", 0))

                    if min_price <= price <= max_price:
                        matched_item = item
                        break

                    start += 1
                    time.sleep(0.1)  # 과도한 요청 방지용 딜레이
                except Exception as e:
                    matched_item = {"error": f"API 에러: {str(e)}"}
                    break

            if matched_item:
                results.append({
                    "category": category,
                    "query": query,
                    "item": matched_item
                })
            else:
                results.append({
                    "category": category,
                    "query": query,
                    "item": {"error": "해당 가격대의 상품이 없습니다."}
                })

    return results

# React 정적 파일 서비스
@app.route('/')
def serve_react_app():
    return send_from_directory(os.path.join(app.root_path, 'frontend1/build'), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.join(app.root_path, 'frontend1/build'), path)

# 추천 API
@app.route('/get_recommendation', methods=['POST'])
def recommend_style_endpoint():
    try:
        image_file = request.files['image']
        image_pil = Image.open(image_file).convert("RGB")
        image_np = np.array(image_pil)
        min_price = int(request.form.get('min_price', 10000))
        max_price = int(request.form.get('max_price', 50000))
        purpose = request.form.get('purpose', '').strip()
        gender = request.form.get('gender', '').strip()

        error, face_features = extract_face_features(image_file)
        face_shape, style_recommendation = None, {}
        if face_features:
            face_shape, style_recommendation = recommend_clothes(face_features)

        body_shape = analyze_body_shape(image_np)
        body_style = recommend_body_style(body_shape) if body_shape else {}

        items = get_clothes_by_price_range(min_price, max_price, body_style, purpose, gender)

        result = {
            'face_shape': face_shape,
            'recommended_style': style_recommendation,
            'body_shape': body_shape,
            'body_style': body_style,
            "items": items
        }
        return jsonify(result)

    except Exception as e:
        print(f"Exception: {e}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
