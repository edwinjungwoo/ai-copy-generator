
// AI 카피 생성기 - Tesseract.js OCR 기반
// API 설정
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// API 키를 사용자 입력에서 가져오는 함수
function getApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        throw new Error('OpenAI API 키를 입력해주세요.');
    }
    if (!apiKey.startsWith('sk-')) {
        throw new Error('올바른 OpenAI API 키 형식이 아닙니다. (sk-로 시작해야 함)');
    }
    return apiKey;
}

// 카피 생성 설정 (실무 중심 전략적 차별화)
const COPY_VARIATIONS = [
    {
        id: 1,
        creativity: "안전형",
        temp: 0.3,
        strategy: "검증된 성과 패턴",
        target: "기존 고객층 + 보수적 신규 고객",
        expectedCTR: "안정적 CTR, 낮은 이탈률",
        riskLevel: "낮음"
    },
    {
        id: 2,
        creativity: "최적화형",
        temp: 0.7,
        strategy: "데이터 기반 균형 전략",
        target: "핵심 타겟층 + 잠재 고객",
        expectedCTR: "높은 CTR, 균형잡힌 전환율",
        riskLevel: "중간"
    },
    {
        id: 3,
        creativity: "도전형",
        temp: 1.0,
        strategy: "차별화 및 바이럴 전략",
        target: "얼리어답터 + 젊은층",
        expectedCTR: "매우 높은 CTR, 화제성 집중",
        riskLevel: "높음"
    }
];

// 플랫폼별 카피 길이 제한
const PLATFORM_LIMITS = {
    naver: { title: 15, description: 45, name: "네이버", color: "#03C75A" },
    meta: { title: 40, description: 125, name: "메타", color: "#1877F2" },
    google: { title: 30, description: 90, name: "구글", color: "#4285F4" },
    kakao: { title: 30, description: 75, name: "카카오", color: "#FEE500" }
};

// 전역 변수
let currentImageFile = null;
let currentAnalysisResult = null;
let imageSegments = [];

// DOM 요소들
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const imageFileName = document.getElementById('imageFileName');
const removeImage = document.getElementById('removeImage');
const ocrProgress = document.getElementById('ocrProgress');
const progressFill = document.getElementById('progressFill');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');
const segmentPreview = document.getElementById('segmentPreview');
const textEditorSection = document.getElementById('textEditorSection');
const extractedText = document.getElementById('extractedText');
const requirementsInput = document.getElementById('requirementsInput');
const generateBtn = document.getElementById('generateBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const resultsTableBody = document.getElementById('resultsTableBody');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const analysisContent = document.getElementById('analysisContent');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    imageInput.addEventListener('change', handleImageSelect);
    removeImage.addEventListener('click', clearImage);
    generateBtn.addEventListener('click', generateCopies);
    extractedText.addEventListener('input', validateInputs);
    
    // API 키 입력 필드 이벤트 리스너 추가
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', validateInputs);
    }
}

// 드래그 오버 처리
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

// 드롭 처리
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleImageFile(files[0]);
    }
}

// 이미지 선택 처리
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// 이미지 파일 처리
function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showError('파일 크기는 10MB 이하여야 합니다.');
        return;
    }
    
    currentImageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        imageFileName.textContent = file.name;
        
        uploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        
        // 이미지 분석 시작
        startImageAnalysis(file);
    };
    reader.readAsDataURL(file);
}

// 이미지 제거
function clearImage() {
    currentImageFile = null;
    currentAnalysisResult = null;
    imageSegments = [];
    imagePreview.style.display = 'none';
    uploadArea.style.display = 'block';
    ocrProgress.style.display = 'none';
    segmentPreview.style.display = 'none';
    textEditorSection.style.display = 'none';
    extractedText.value = '';
    imageInput.value = '';
    validateInputs();
}

// 이미지 분석 시작
async function startImageAnalysis(file) {
    try {
        ocrProgress.style.display = 'block';
        updateProgress(0, '이미지 분석 준비 중...');
        
        // 1단계: 이미지 분할
        updateProgress(20, '이미지 분할 중...');
        const segments = await segmentImage(file);
        imageSegments = segments;
        
        // 2단계: 분할 미리보기 표시
        updateProgress(40, '분할 결과 표시 중...');
        displaySegmentPreview(segments);
        
        // 3단계: 각 구간별 Tesseract OCR 수행
        updateProgress(60, 'Tesseract OCR 텍스트 추출 중...');
        const ocrResults = await performTesseractOCROnSegments(segments);
        
        // 4단계: 텍스트 통합 및 분석
        updateProgress(80, '텍스트 통합 및 분석 중...');
        const combinedText = combineOCRResults(ocrResults);
        const analysisResult = await analyzeForMarketing(combinedText);
        
        // 결과 저장 및 표시 (원본 OCR 텍스트 표시)
        // API 키가 있을 때만 분석 결과 저장
        if (analysisResult) {
            currentAnalysisResult = analysisResult;
        }
        extractedText.value = combinedText; // 원본 OCR 텍스트 표시
        
        updateProgress(100, '분석 완료!');
        
        setTimeout(() => {
            ocrProgress.style.display = 'none';
            textEditorSection.style.display = 'block';
            validateInputs();
        }, 1000);
        
        console.log('이미지 분석 완료:', analysisResult);
        
    } catch (error) {
        console.error('이미지 분석 오류:', error);
        ocrProgress.style.display = 'none';
        showError('이미지 분석 중 오류가 발생했습니다: ' + error.message);
    }
}

// 이미지 분할 함수
async function segmentImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 원본 이미지 크기
            const originalWidth = img.width;
            const originalHeight = img.height;
            
            console.log(`이미지 크기: ${originalWidth} x ${originalHeight}`);
            
            // 이미지 비율 계산
            const aspectRatio = originalHeight / originalWidth;
            console.log(`이미지 비율 (높이/너비): ${aspectRatio.toFixed(2)}`);
            
            let segments = [];
            let segmentCount = 1;
            
            // 동적 구간 수 결정 로직
            if (aspectRatio >= 4.0) {
                // 매우 긴 이미지 (4:1 이상) - 5-6개 구간
                segmentCount = Math.min(6, Math.ceil(aspectRatio / 0.8));
                console.log(`매우 긴 이미지 감지: ${segmentCount}개 구간으로 분할`);
            } else if (aspectRatio >= 2.5) {
                // 긴 이미지 (2.5:1 이상) - 3-4개 구간
                segmentCount = Math.min(4, Math.ceil(aspectRatio / 0.7));
                console.log(`긴 이미지 감지: ${segmentCount}개 구간으로 분할`);
            } else if (aspectRatio >= 1.5) {
                // 중간 길이 이미지 (1.5:1 이상) - 2-3개 구간
                segmentCount = Math.min(3, Math.ceil(aspectRatio / 0.6));
                console.log(`중간 길이 이미지 감지: ${segmentCount}개 구간으로 분할`);
            } else {
                // 일반 이미지 - 분할하지 않음
                segmentCount = 1;
                console.log(`일반 이미지 감지: 분할하지 않음`);
            }
            
            if (segmentCount > 1) {
                const segmentHeight = Math.floor(originalHeight / segmentCount);
                console.log(`각 구간 높이: ${segmentHeight}px`);
                
                let completedSegments = 0;
                
                for (let i = 0; i < segmentCount; i++) {
                    const y = i * segmentHeight;
                    const height = (i === segmentCount - 1) ? originalHeight - y : segmentHeight;
                    
                    // 각 구간마다 새로운 캔버스 생성
                    const segmentCanvas = document.createElement('canvas');
                    const segmentCtx = segmentCanvas.getContext('2d');
                    
                    segmentCanvas.width = originalWidth;
                    segmentCanvas.height = height;
                    
                    // 원본 이미지에서 해당 Y 위치의 구간만 잘라서 그리기
                    segmentCtx.drawImage(
                        img,                    // 원본 이미지
                        0, y,                   // 원본에서 자를 시작 위치 (x, y)
                        originalWidth, height,  // 원본에서 자를 크기 (width, height)
                        0, 0,                   // 캔버스에 그릴 시작 위치 (x, y)
                        originalWidth, height   // 캔버스에 그릴 크기 (width, height)
                    );
                    
                    segmentCanvas.toBlob((blob) => {
                        segments.push({
                            id: i + 1,
                            blob: blob,
                            x: 0,
                            y: y,
                            width: originalWidth,
                            height: height,
                            dataUrl: segmentCanvas.toDataURL()
                        });
                        
                        completedSegments++;
                        if (completedSegments === segmentCount) {
                            // ID 순으로 정렬
                            segments.sort((a, b) => a.id - b.id);
                            resolve(segments);
                        }
                    });
                }
            } else {
                // 일반 이미지는 분할하지 않음
                canvas.width = originalWidth;
                canvas.height = originalHeight;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    segments.push({
                        id: 1,
                        blob: blob,
                        x: 0,
                        y: 0,
                        width: originalWidth,
                        height: originalHeight,
                        dataUrl: canvas.toDataURL()
                    });
                    resolve(segments);
                });
            }
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 분할 미리보기 표시
function displaySegmentPreview(segments) {
    if (segments.length <= 1) {
        segmentPreview.style.display = 'none';
        return;
    }
    
    segmentPreview.style.display = 'block';
    const container = segmentPreview.querySelector('.segment-container');
    container.innerHTML = '';
    
    segments.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'segment-item';
        segmentDiv.innerHTML = `
            <div class="segment-header">구간 ${segment.id}</div>
            <img src="${segment.dataUrl}" alt="구간 ${segment.id}">
        `;
        container.appendChild(segmentDiv);
    });
}

// 구간별 Tesseract OCR 수행
async function performTesseractOCROnSegments(segments) {
    const results = [];
    
    // Tesseract.js 동적 로드
    if (!window.Tesseract) {
        updateProgress(65, 'Tesseract.js 라이브러리 로딩 중...');
        await loadTesseractJS();
    }
    
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        updateProgress(70 + (i * 20 / segments.length), `구간 ${segment.id} Tesseract OCR 처리 중...`);
        
        try {
            const ocrResult = await performTesseractOCR(segment.blob);
            results.push({
                segmentId: segment.id,
                text: ocrResult,
                x: segment.x,
                y: segment.y
            });
        } catch (error) {
            console.error(`구간 ${segment.id} OCR 실패:`, error);
            results.push({
                segmentId: segment.id,
                text: '',
                x: segment.x,
                y: segment.y
            });
        }
    }
    
    return results;
}

// Tesseract.js 동적 로드
async function loadTesseractJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Tesseract OCR 수행
async function performTesseractOCR(imageBlob) {
    try {
        const { data: { text } } = await Tesseract.recognize(
            imageBlob,
            'kor+eng', // 한국어 + 영어 지원
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        // 세부 진행률은 표시하지 않음 (너무 빠름)
                    }
                }
            }
        );
        
        return text.trim();
    } catch (error) {
        console.error('Tesseract OCR 오류:', error);
        return '';
    }
}

// OCR 결과 통합
function combineOCRResults(ocrResults) {
    // Y 좌표 순으로 정렬하여 위에서 아래 순서로 텍스트 결합
    const sortedResults = ocrResults.sort((a, b) => a.y - b.y);
    
    let combinedText = '';
    sortedResults.forEach((result, index) => {
        if (result.text.trim()) {
            if (index > 0) combinedText += '\n\n';
            // 대괄호 제거하고 구간 표시를 더 자연스럽게
            combinedText += `구간 ${result.segmentId}\n${result.text.trim()}`;
        }
    });
    
    return combinedText || '텍스트를 추출할 수 없습니다.';
}

// 마케팅 분석 수행
async function analyzeForMarketing(extractedText) {
    // API 키 확인 - 없으면 null 반환 (분석 제공 안 함)
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyValue = apiKeyInput ? apiKeyInput.value.trim() : '';
    
    if (!apiKeyValue || !apiKeyValue.startsWith('sk-')) {
        // API 키가 없거나 올바르지 않으면 분석 제공하지 않음
        return null;
    }
    
    // API 키가 있을 때만 AI 분석 수행
    const prompt = `당신은 10년 경력의 디지털 마케팅 전문가입니다. 다음 OCR 추출 텍스트를 분석하여 실무에 바로 활용 가능한 마케팅 인사이트를 제공해주세요.

추출된 텍스트:
${extractedText}

분석 목표:
- 마케팅 대행사 실무진이 바로 활용할 수 있는 구체적 인사이트 제공
- 각 플랫폼별 최적화 전략 수립을 위한 기초 데이터 도출
- 성과 예측 가능한 요소들 식별
- ROI 최적화를 위한 실행 가능한 전략 도출

실무 중심 분석 요구사항:
1. 타겟 페르소나를 구체적으로 정의 (연령, 성별, 관심사, 구매력, 라이프스타일 등)
2. 경쟁 우위 요소를 명확히 식별하고 활용 방안 제시
3. 플랫폼별 어필 포인트 차별화 방향 및 최적 타이밍 분석
4. 예상 CTR 향상 요소 분석 및 구체적 개선 포인트 도출
5. 리타겟팅 전략 수립을 위한 고객 여정 단계 및 터치포인트 파악
6. 실제 광고 운영 시 고려해야 할 리스크 요소 및 대응 방안

중요 지침:
- 추상적 표현보다는 구체적이고 실행 가능한 인사이트 제공
- 업계 벤치마크 대비 차별화 포인트 명확히 제시
- 예산 효율성을 고려한 우선순위 전략 포함
- 측정 가능한 KPI 및 성과 지표 제안

응답 형식 (이모티콘 사용 금지):
제품명: [제품/서비스명을 명확히 식별]
핵심가치: [고객에게 제공하는 핵심 가치와 차별화 포인트]
타겟고객: [구체적 페르소나 - 연령대, 성별, 소득수준, 관심사, 구매패턴 포함]
해결문제: [타겟이 겪는 구체적 페인포인트와 니즈]
차별화요소: [경쟁사 대비 명확한 우위점과 포지셔닝 전략]
감정어필: [감정적 트리거 요소와 심리적 동기 유발 포인트]
논리어필: [합리적 구매 근거와 객관적 혜택]
행동유도: [효과적인 CTA 전략과 전환 최적화 방안]
가격전략: [가격/할인 정보 및 가격 경쟁력, 없으면 "정보없음"]
핵심키워드: [SEO/광고 최적화용 키워드 5개를 쉼표로 구분, 검색량과 경쟁도 고려]

위 형식을 정확히 준수하고, 각 항목마다 실무에서 바로 활용 가능한 구체적 내용을 제공해주세요.`;

    try {
        const apiKey = apiKeyValue; // 이미 검증된 API 키 사용
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4.1-nano",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 800,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`분석 API 오류: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        return parseAnalysisResponse(content, extractedText);
        
    } catch (error) {
        console.error('AI 마케팅 분석 실패:', error);
        return null;
    }
}

// 분석 응답 파싱
function parseAnalysisResponse(content, originalText) {
    const result = {
        extractedText: originalText,
        productName: '제품/서비스',
        coreValue: '핵심 가치 제안',
        targetCustomer: '타겟 고객',
        problemSolved: '해결하는 문제',
        differentiator: '차별화 요소',
        emotionalAppeal: '감정적 어필',
        logicalAppeal: '논리적 어필',
        pricingStrategy: null,
        actionInducement: 'CTA 전략',
        marketingKeywords: ['브랜드', '가치', '혜택', '품질', '신뢰']
    };
    
    try {
        const productMatch = content.match(/제품명[:\s]*(.+?)(?=\n.*?:|$)/s);
        const valueMatch = content.match(/핵심가치[:\s]*(.+?)(?=\n.*?:|$)/s);
        const targetMatch = content.match(/타겟고객[:\s]*(.+?)(?=\n.*?:|$)/s);
        const problemMatch = content.match(/해결문제[:\s]*(.+?)(?=\n.*?:|$)/s);
        const diffMatch = content.match(/차별화요소[:\s]*(.+?)(?=\n.*?:|$)/s);
        const emotionMatch = content.match(/감정어필[:\s]*(.+?)(?=\n.*?:|$)/s);
        const logicMatch = content.match(/논리어필[:\s]*(.+?)(?=\n.*?:|$)/s);
        const pricingMatch = content.match(/가격전략[:\s]*(.+?)(?=\n.*?:|$)/s);
        const actionMatch = content.match(/행동유도[:\s]*(.+?)(?=\n.*?:|$)/s);
        const keywordsMatch = content.match(/핵심키워드[:\s]*(.+?)(?=\n.*?:|$)/s);
        
        if (productMatch && productMatch[1].trim()) {
            result.productName = productMatch[1].trim();
        }
        if (valueMatch && valueMatch[1].trim()) {
            result.coreValue = valueMatch[1].trim();
        }
        if (targetMatch && targetMatch[1].trim()) {
            result.targetCustomer = targetMatch[1].trim();
        }
        if (problemMatch && problemMatch[1].trim()) {
            result.problemSolved = problemMatch[1].trim();
        }
        if (diffMatch && diffMatch[1].trim()) {
            result.differentiator = diffMatch[1].trim();
        }
        if (emotionMatch && emotionMatch[1].trim()) {
            result.emotionalAppeal = emotionMatch[1].trim();
        }
        if (logicMatch && logicMatch[1].trim()) {
            result.logicalAppeal = logicMatch[1].trim();
        }
        if (pricingMatch && pricingMatch[1].trim() && !pricingMatch[1].includes('정보없음')) {
            result.pricingStrategy = pricingMatch[1].trim();
        }
        if (actionMatch && actionMatch[1].trim()) {
            result.actionInducement = actionMatch[1].trim();
        }
        if (keywordsMatch && keywordsMatch[1].trim()) {
            const keywords = keywordsMatch[1].split(',').map(k => k.trim()).filter(k => k);
            if (keywords.length > 0) {
                result.marketingKeywords = keywords;
            }
        }
        
    } catch (error) {
        console.error('응답 파싱 오류:', error);
    }
    
    return result;
}

// 진행률 업데이트
function updateProgress(percentage, status) {
    const roundedPercentage = Math.round(percentage);
    progressFill.style.width = roundedPercentage + '%';
    progressPercent.textContent = roundedPercentage + '%';
    progressStatus.textContent = status;
}

// 입력 유효성 검사
function validateInputs() {
    const hasText = extractedText.value.trim().length > 0;
    const hasSelectedPlatforms = getSelectedPlatforms().length > 0;
    const hasApiKey = document.getElementById('apiKeyInput').value.trim().length > 0;
    generateBtn.disabled = !(hasText && hasSelectedPlatforms && hasApiKey);
}

// 선택된 플랫폼 가져오기
function getSelectedPlatforms() {
    const checkboxes = document.querySelectorAll('.platform-chip input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// 카피 생성 메인 함수
async function generateCopies() {
    const textContent = extractedText.value.trim();
    if (!textContent) {
        showError('추출된 텍스트가 없습니다.');
        return;
    }
    
    const selectedPlatforms = getSelectedPlatforms();
    if (selectedPlatforms.length === 0) {
        showError('최소 하나의 플랫폼을 선택해주세요.');
        return;
    }
    
    const requirements = requirementsInput.value.trim();
    
    showLoading();
    
    try {
        // 분석 데이터 준비 - API 키가 있으면 새로 분석 수행
        let analysisData = null;
        
        // API 키가 있으면 실시간 마케팅 분석 수행
        const apiKeyInput = document.getElementById('apiKeyInput');
        const hasValidApiKey = apiKeyInput && apiKeyInput.value.trim().startsWith('sk-');
        
        if (hasValidApiKey) {
            updateLoadingMessage('마케팅 분석 수행 중...');
            analysisData = await analyzeForMarketing(textContent);
        }
        
        // 분석 데이터가 없으면 기본값 사용하지 않음 (null 유지)
        
        // 플랫폼별 카피 생성
        updateLoadingMessage('AI 카피 생성 중...');
        const copies = await generatePlatformCopies(textContent, selectedPlatforms, requirements);
        
        // 결과 표시
        displayResults(copies, analysisData);
        
    } catch (error) {
        console.error('카피 생성 오류:', error);
        showError('카피 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 플랫폼별 카피 생성
async function generatePlatformCopies(textContent, selectedPlatforms, requirements) {
    const copies = {};
    
    for (const platform of selectedPlatforms) {
        const config = PLATFORM_LIMITS[platform];
        if (!config) continue;
        
        try {
            const platformCopies = await generateMultipleCopies(platform, config, textContent, requirements);
            copies[platform] = platformCopies;
        } catch (error) {
            console.error(`${platform} 카피 생성 오류:`, error);
            copies[platform] = COPY_VARIATIONS.map(variation => ({
                id: variation.id,
                creativity: variation.creativity,
                title: '생성 실패',
                description: '카피 생성 중 오류가 발생했습니다.'
            }));
        }
    }
    
    return copies;
}

// 다중 카피 생성
async function generateMultipleCopies(platform, config, textContent, requirements) {
    const copies = [];
    
    // 분석 보고서 데이터 활용
    const analysisData = currentAnalysisResult || {};
    const analysisContext = currentAnalysisResult ? `

【마케팅 분석 보고서 활용】
• 핵심 가치 제안: ${analysisData.coreValue || '핵심 가치'}
• 타겟 고객: ${analysisData.targetCustomer || '주요 고객층'}
• 해결하는 문제: ${analysisData.problemSolved || '고객 문제'}
• 차별화 요소: ${analysisData.differentiator || '차별화 포인트'}
• 감정적 어필: ${analysisData.emotionalAppeal || '감정적 요소'}
• 논리적 어필: ${analysisData.logicalAppeal || '논리적 요소'}
• 행동 유도 전략: ${analysisData.actionInducement || 'CTA 전략'}
• 핵심 키워드: ${analysisData.marketingKeywords ? analysisData.marketingKeywords.join(', ') : '브랜드, 가치, 혜택'}` : '';
    
    for (const variation of COPY_VARIATIONS) {
        const requirementsText = requirements ? `

【마케터 특별 요구사항】
${requirements}` : '';
        
        const creativityGuide = {
            "안전형": `검증된 성과 패턴 기반 카피 작성
• 업계 표준 문구와 검증된 키워드 활용
• 구체적 수치와 객관적 근거 중심
• 신뢰도 높은 표현으로 안정적 성과 확보
• 기존 고객 재구매 및 추천 유도에 최적화
• 예상 성과: 안정적 CTR 2-3%, 낮은 이탈률, 높은 브랜드 신뢰도`,

            "최적화형": `데이터 기반 균형 전략 카피 작성
• A/B 테스트 검증된 효과적 문구 패턴 적용
• 감정적 어필과 논리적 근거의 황금비율 조합
• 타겟 페르소나별 맞춤 메시지 차별화
• 플랫폼 알고리즘 최적화 키워드 전략적 배치
• 예상 성과: 높은 CTR 4-6%, 우수한 전환율, 최적 ROI`,

            "도전형": `차별화 및 바이럴 전략 카피 작성
• 업계 관습을 깨는 파격적이고 독창적 표현
• 화제성과 기억도를 극대화하는 임팩트 메시지
• 소셜 공유와 입소문 유발 요소 포함
• 브랜드 차별화와 포지셔닝 강화에 집중
• 예상 성과: 매우 높은 CTR 7-10%, 높은 화제성, 브랜드 인지도 급상승`
        };
        
        const platformStrategy = {
            "naver": `네이버 검색광고 최적화 전략
• 검색 의도 명확한 사용자 대상 직접적 혜택 어필
• 쇼핑검색 연동을 고려한 상품명/브랜드명 포함
• 네이버 쇼핑 리뷰/평점 연계 신뢰도 강화 표현
• 모바일 우선 짧고 임팩트 있는 메시지 구성
• 네이버 사용자 특성: 정보 탐색형, 비교구매 성향`,

            "meta": `메타(페이스북/인스타그램) SNS 광고 전략
• 소셜 피드 환경에서 스크롤 스톱 유발 요소 강화
• 시각적 콘텐츠와 조화되는 감정적 스토리텔링
• 공유/댓글 유도하는 참여형 메시지 구성
• 인플루언서 마케팅 연계 가능한 트렌디한 표현
• 메타 사용자 특성: 감정 중심, 사회적 영향 민감`,

            "google": `구글 검색/디스플레이 광고 최적화 전략
• 검색 결과 상위 노출을 위한 SEO 키워드 전략적 배치
• 글로벌 사용자 고려한 명확하고 직관적 가치 제안
• 구글 품질평가 기준에 부합하는 정확하고 유용한 정보
• 다양한 디바이스 환경 대응 간결한 메시지 구조
• 구글 사용자 특성: 목적 지향적, 효율성 추구`,

            "kakao": `카카오 플랫폼 광고 전략
• 카카오톡 친구 추천/공유 기능 활용 바이럴 요소 포함
• 한국 사용자 정서에 맞는 친근하고 정감 있는 톤앤매너
• 카카오페이/선물하기 등 간편결제 연계 구매 유도
• 일상 대화체 활용한 자연스러운 관심 유발
• 카카오 사용자 특성: 관계 중심, 편의성 추구`
        };

        const strategyGuide = {
            "안전형": "신뢰성과 검증된 혜택 중심. 구체적 수치와 사회적 증거 활용",
            "최적화형": "감정과 논리의 균형. FOMO 심리와 명확한 가치 제안 조합",
            "도전형": "독창적이고 파격적 접근. 화제성과 차별화로 주목도 극대화"
        };

        const uniqueApproach = {
            "안전형": `기능/혜택 중심의 직접적 어필 전략
• 구체적 수치, 통계, 객관적 근거 활용
• "입증된", "검증된", "보장" 등 신뢰성 키워드 사용
• 기존 고객 후기나 사회적 증거 암시
• 명확한 기능적 혜택과 실용적 가치 강조`,

            "최적화형": `감정적 공감대와 스토리텔링 전략
• 고객의 상황과 니즈에 공감하는 메시지
• "당신을 위한", "맞춤형", "특별한" 등 개인화 표현
• 문제 해결 과정을 스토리로 구성
• 감정적 만족과 실용적 해결책의 조화`,

            "도전형": `호기심 유발과 반전 메시지 전략
• 질문형, 반전형, 도발적 표현 활용
• 기존 상식을 뒤집는 새로운 관점 제시
• "왜", "어떻게", "진짜" 등 호기심 자극 키워드
• 독특하고 기억에 남는 창의적 표현`
        };

        const prompt = `당신은 ${config.name} 플랫폼 전문 퍼포먼스 마케터입니다. ${variation.creativity} 전략으로 고성과 카피를 작성해주세요.

【소재 분석】
${textContent}${analysisContext}${requirementsText}

【플랫폼 전략】
${platformStrategy[platform]}

【${variation.creativity} 고유 접근법】
${uniqueApproach[variation.creativity]}

【매체별 길이 제한 준수 필수】
• 제목: 정확히 ${config.title}자 이내로 작성 (공백 포함)
• 설명: 정확히 ${config.description}자 이내로 작성 (공백 포함)
• ${config.name} 플랫폼 규정을 반드시 준수하여 길이 초과 금지

【중복 방지 필수 원칙】
• ${variation.creativity}만의 고유한 키워드와 표현 사용
• 다른 전략과 절대 겹치지 않는 독창적 메시지
• 각 전략별 차별화된 톤앤매너 적용
• 동일한 소구점이나 구조 반복 금지

【금지사항】
- 이모티콘 사용 금지
- 다른 전략과 유사한 표현 절대 금지
- 뻔한 표현 금지 (할인, 특가 등)
- 글자 수 초과 절대 금지

【응답 형식】
제목: [${config.title}자 이내 ${variation.creativity} 고유 제목]
설명: [${config.description}자 이내 ${variation.creativity} 차별화 설명]`;

        try {
            const apiKey = getApiKey();
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4.1-nano",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 300,
                    temperature: variation.temp
                })
            });
            
            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }
            
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            
            const titleMatch = content.match(/제목:\s*(.+?)(?=\n|설명:|$)/);
            const descMatch = content.match(/설명:\s*(.+?)(?=\n|$)/s);
            
            let title = titleMatch ? titleMatch[1].trim() : `${variation.creativity} 카피`;
            let description = descMatch ? descMatch[1].trim() : '카피 생성 중 오류 발생';
            
            // 길이 제한 제거 - 전체 카피 그대로 사용
            
            copies.push({
                id: variation.id,
                creativity: variation.creativity,
                title: title,
                description: description
            });
            
        } catch (error) {
            console.error(`카피 생성 실패:`, error);
            copies.push({
                id: variation.id,
                creativity: variation.creativity,
                title: `${variation.creativity} 카피`,
                description: `생성 실패: ${error.message}`
            });
        }
    }
    
    return copies;
}

// 분석 보고서 표시
function displayAnalysisReport(analysisData) {
    if (!analysisData) {
        // API 키가 없어서 분석 데이터가 없을 때
        analysisContent.innerHTML = `
            <div class="analysis-report">
                <h3 class="report-title">실무 활용 가능한 마케팅 전략 분석</h3>
                <div class="analysis-item">
                    <div class="analysis-content" style="text-align: center; color: var(--gray-500); padding: 20px;">
                        OpenAI API 키를 입력하면 AI 마케팅 분석을 제공합니다.
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    analysisContent.innerHTML = `
        <div class="analysis-report">
            <h3 class="report-title">실무 활용 가능한 마케팅 전략 분석</h3>
            
            <div class="analysis-item">
                <div class="analysis-label">핵심 가치</div>
                <div class="analysis-content">• ${analysisData.coreValue}</div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-label">타겟 고객</div>
                <div class="analysis-content">• ${analysisData.targetCustomer}</div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-label">문제 해결</div>
                <div class="analysis-content">• ${analysisData.problemSolved}</div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-label">차별화 요소</div>
                <div class="analysis-content">• ${analysisData.differentiator}</div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-label">감정적 어필 (F)</div>
                <div class="analysis-content">• ${analysisData.emotionalAppeal}</div>
            </div>
            
            <div class="analysis-item">
                <div class="analysis-label">논리적 어필 (T)</div>
                <div class="analysis-content">• ${analysisData.logicalAppeal}</div>
            </div>
            
            ${analysisData.pricingStrategy ? `
            <div class="analysis-item">
                <div class="analysis-label">가격 전략</div>
                <div class="analysis-content">• ${analysisData.pricingStrategy}</div>
            </div>
            ` : ''}
            
            <div class="analysis-item">
                <div class="analysis-label">핵심 키워드</div>
                <div class="analysis-content">• ${analysisData.marketingKeywords.slice(0, 5).map(keyword => {
                    const shortKeyword = keyword.length > 10 ? keyword.substring(0, 10) : keyword;
                    return `#${shortKeyword}`;
                }).join(' ')}</div>
            </div>
        </div>
    `;
}

// 결과 표시
function displayResults(copies, analysisData) {
    displayAnalysisReport(analysisData);
    
    resultsTableBody.innerHTML = '';
    
    for (const [platform, config] of Object.entries(PLATFORM_LIMITS)) {
        const platformCopies = copies[platform];
        if (!platformCopies) continue;
        
        platformCopies.forEach(copy => {
            const row = document.createElement('tr');
            row.className = `platform-row platform-${platform}`;
            
            row.innerHTML = `
                <td class="platform-cell">
                    <div class="platform-name">${config.name}</div>
                </td>
                <td class="copy-cell">
                    <div class="copy-content">
                        <div class="title-label">Title</div>
                        <div class="title-text">${copy.title}</div>
                        
                        <div class="description-label">Description</div>
                        <div class="description-text">${copy.description}</div>
                    </div>
                </td>
            `;
            
            resultsTableBody.appendChild(row);
        });
    }
    
    resultsSection.style.display = 'block';
}

// 플랫폼 아이콘 반환
function getPlatformIcon(platform) {
    const icons = {
        naver: 'N',
        meta: 'f',
        google: 'G',
        kakao: 'K'
    };
    return icons[platform] || '?';
}

// 클립보드에 복사
async function copyToClipboard(platform, title, description, copyId) {
    const text = `[${PLATFORM_LIMITS[platform].name} #${copyId}]\n제목: ${title}\n설명: ${description}`;
    
    try {
        await navigator.clipboard.writeText(text);
        
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.innerHTML = '<span>복사됨!</span>';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
        
    } catch (err) {
        console.error('복사 실패:', err);
        showError('클립보드 복사에 실패했습니다.');
    }
}

// 로딩 메시지 업데이트
function updateLoadingMessage(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
}

// UI 상태 관리
function showLoading() {
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function hideLoading() {
    loadingSection.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    loadingSection.style.display = 'none';
}

function showSuccess(message) {
    // 성공 메시지 표시 (간단한 알림)
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function hideError() {
    errorSection.style.display = 'none';
}
            