import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // 기존 App.css 그대로 사용

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [faceShape, setFaceShape] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [recommendedStyle, setRecommendedStyle] = useState(null);
  const [bodyStyle, setBodyStyle] = useState(null);
  const [items, setItems] = useState([]);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setImage(file);

      const display = document.getElementById('file-name-display');
      if (display) {
        display.textContent = `선택된 파일: ${file.name}`;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      alert('이미지를 업로드해주세요!');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('min_price', minPrice);
    formData.append('max_price', maxPrice);

    try {
      const res = await axios.post(
        'https://four-1pj.onrender.com/get_recommendation',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setFaceShape(res.data.face_shape);
      setBodyShape(res.data.body_shape);
      setRecommendedStyle(res.data.recommended_style);
      setBodyStyle(res.data.body_style);
      setItems(res.data.items || []);
    } catch (err) {
      console.error('분석 요청 중 오류 발생', err);
      alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const hasResult =
    !!faceShape ||
    !!bodyShape ||
    !!recommendedStyle ||
    !!bodyStyle ||
    items.length > 0;

  return (
    <div className="container">
      <h1>AI 이미지 분석 및 스타일 추천</h1>

      <form onSubmit={handleSubmit} className="analysis-form">
        {/* 가격 범위 섹션 */}
        <div className="form-section price-range-section">
          <h2>가격 범위</h2>
          <div className="price-inputs-container">
            <div className="input-group">
              <label htmlFor="min-price">최소 가격</label>
              <input
                type="number"
                id="min-price"
                placeholder="최소 금액"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="price-input"
                min="0"
              />
            </div>
            <div className="input-group">
              <label htmlFor="max-price">최대 가격</label>
              <input
                type="number"
                id="max-price"
                placeholder="최대 금액"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="price-input"
                min={minPrice || '0'}
              />
            </div>
          </div>
        </div>

        {/* 이미지 업로드 & 미리보기 */}
        <div className="form-section image-upload-section">
          <h2>이미지 업로드</h2>

          {preview && (
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '300px',
                height: '400px',
                objectFit: 'cover',
                borderRadius: '6px',
                marginBottom: '10px'
              }}
            />
          )}

          <label htmlFor="file-upload" className="custom-file-upload">
            {preview ? '다른 사진 선택' : '파일 선택'}
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <span id="file-name-display" className="file-name">
            {preview ? `선택된 파일: ${image?.name}` : '파일을 선택하세요'}
          </span>
        </div>

        {/* 분석하기 버튼 */}
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? '분석중...' : '분석하기'}
        </button>
      </form>

      {/* 결과 영역 */}
      {!loading && hasResult && (
        <div className="results-container">
          {faceShape && (
            <div className="result-section shape-results">
              <h2>얼굴형: {faceShape}</h2>
            </div>
          )}

          {recommendedStyle && (
            <div className="result-section style-section">
              <h3>얼굴형 추천 스타일:</h3>
              <ul>
                {Object.entries(recommendedStyle).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong>{' '}
                    {Array.isArray(value) ? value.join(', ') : value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bodyShape && (
            <div className="result-section shape-results">
              <h2>체형: {bodyShape}</h2>
            </div>
          )}

          {bodyStyle && (
            <div className="result-section style-section">
              <h3>체형 추천 스타일:</h3>
              <ul>
                {Object.entries(bodyStyle).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong>{' '}
                    {Array.isArray(value) ? value.join(', ') : value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length > 0 && (
            <div className="result-section items-section">
              <h3>추천된 상품:</h3>
              {items.map((item, idx) => (
                <div key={idx} className="item">
                  <h4>{item.category}</h4>
                  {item.item.error ? (
                    <p>{item.item.error}</p>
                  ) : (
                    <a
                      href={item.item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={item.item.image} alt={item.item.title} />
                      <p>{item.item.title}</p>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;