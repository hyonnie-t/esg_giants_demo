# esg_giants_demo — ESG 예산 배분 시연

대학원 수업 발표용 시연 웹앱(정적 4파일, 백엔드 없음). 중3이 가상 예산 100을 카드 12장에 나눠 쓰고 3회차 판단 변화를 본다. 교사 화면은 `?teacher=1`.
배포: https://hyonnie-t.github.io/esg_giants_demo/ (GitHub Pages, public)

## 구조
- `index.html` / `style.css` / `data.js`(카드 12장·영역 풀이) / `app.js`(학생 화면 + `TEACHER-ONLY` 블록)
- 저장은 localStorage만(전부 try/catch). 이름·학번 입력 없음.

## 규칙
- 카드 문구·분류는 바꾸지 않는다. 배분 화면(`renderAlloc`)은 `area`를 읽지 않는다.
- 학생 화면에 "가설"·검증 상태 표현을 넣지 않는다. 가설은 `TEACHER-ONLY` 블록에만 둔다.
- 점수·순위·시뮬레이션 계산 금지. 가상 학생 데이터는 시드 고정, 영역별 서사 없음.
- 롯데 상징색: 남색 #041e42, 빨강 #d00f31.
