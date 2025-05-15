import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const PURPOSES = [
  { value: 'date', label: '데이트룩' },
  { value: 'interview', label: '면접룩' },
  { value: 'casual', label: '캐주얼' },
  { value: 'formal', label: '포멀' },
  { value: 'custom', label: '직접 입력' },
];

function App() {
  // 가격 범위
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // 목적 기반 스타일
  const [showPurposeOptions, setShowPurposeOptions] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');

  // 이미지 업로드 & preview
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // 로딩 & 결과
  const [loading, setLoading] = useState(false);
  const [faceShape, setFaceShape] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [recommendedStyle, setRecommendedStyle] = useState(null);
  const [bodyStyle, setBodyStyle] = useState(null);
  const [items, setItems] = useState([]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    const disp = document.getElementById('file-name-display');
    if (disp) disp.textContent = `선택된 파일: ${file.name}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      alert('이미지를 업로드해주세요!');
      return;
    }
    if (!purpose) {
      alert('스타일 목적을 선택해주세요!');
      return;
    }
    if (purpose === 'custom' && !customPurpose.trim()) {
      alert('직접 입력한 목적을 입력해주세요!');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('purpose', purpose === 'custom' ? customPurpose : purpose);
    formData.append('min_price', minPrice);
    formData.append('max_price', maxPrice);

    try {
      const res = await axios.post(
        'https://four-1pj.onrender.com/get_recommendation',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setFaceShape(res.data.face_shape || '');
      setBodyShape(res.data.body_shape || '');
      setRecommendedStyle(res.data.recommended_style || null);
      setBodyStyle(res.data.body_style || null);
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
      alert('분석 중 오류가 발생했습니다.');
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
        {/* 1. 가격 범위 */}
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

        {/* 2. 이미지 업로드 & 미리보기 */}
        <div className="form-section image-upload-section">
          {preview ? (
            <>
              <img src={preview} alt="Preview" className="preview-image" />
              <label htmlFor="file-upload" className="custom-file-upload">
                사진 바꾸기
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </>
          ) : (
            <>
              <h2>이미지 업로드</h2>
              <label htmlFor="file-upload" className="custom-file-upload">
                파일 선택
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <span id="file-name-display" className="file-name">
                파일을 선택하세요
              </span>
            </>
          )}
        </div>

        {/* 3. 목적 기반 스타일 */}
        <div className="form-section purpose-section">
          <button
            type="button"
            className="purpose-button"
            onClick={() => setShowPurposeOptions((v) => !v)}
          >
            목적 기반 스타일
          </button>
          {showPurposeOptions && (
            <div className="purpose-options">
              {PURPOSES.map((opt) => (
                <label key={opt.value} className="radio-label">
                  <input
                    type="radio"
                    name="purpose"
                    value={opt.value}
                    checked={purpose === opt.value}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomPurpose('');
                      }
                    }}
                  />
                  {opt.label}
                </label>
              ))}
              {purpose === 'custom' && (
                <input
                  type="text"
                  placeholder="직접 입력"
                  className="custom-purpose-input"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* 4. 분석하기 버튼 */}
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? '분석중...' : '분석하기'}
        </button>
      </form>

      {/* 5. 결과 섹션 */}
      {!loading && hasResult && (
        <div className="results-container">
          {faceShape && (
            <div className="result-section">
              <h2>얼굴형: {faceShape}</h2>
            </div>
          )}
          {recommendedStyle && (
            <div className="result-section">
              <h3>얼굴형 추천 스타일:</h3>
              <ul>
                {Object.entries(recommendedStyle).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}:</strong>{' '}
                    {Array.isArray(v) ? v.join(', ') : v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bodyShape && (
            <div className="result-section">
              <h2>체형: {bodyShape}</h2>
            </div>
          )}
          {bodyStyle && (
            <div className="result-section">
              <h3>체형 추천 스타일:</h3>
              <ul>
                {Object.entries(bodyStyle).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}:</strong>{' '}
                    {Array.isArray(v) ? v.join(', ') : v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {items.length > 0 && (
            <div className="result-section items-section">
              <h3>추천된 상품:</h3>
              {items.map((it, i) => (
                <div key={i} className="item">
                  <h4>{it.category}</h4>
                  {!it.item.error ? (
                    <a
                      href={it.item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="item-link"
                    >
                      <img
                        src={it.item.image}
                        alt={it.item.title}
                        className="item-image"
                      />
                      <p className="item-title">{it.item.title}</p>
                    </a>
                  ) : (
                    <p>{it.item.error}</p>
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