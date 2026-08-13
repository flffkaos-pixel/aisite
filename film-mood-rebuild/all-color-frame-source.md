# 전체 색상 원본 프레임 정본

원본 공개 API `https://www.yeguozi.com/api/colors/{colorId}/stills?offset={offset}&limit=60`를 사용해 Film Mood에서 지원하는 9개 색상의 실제 스크린샷, 영화 메타데이터, 프레임별 팔레트와 비율을 수집했다. 원본 응답은 `/home/ubuntu/webdev-static-assets/yeguozi-color-stills.json`에 보관한다.

| 색상 ID | 수집된 원본 프레임 수 |
| --- | ---: |
| red | 499 |
| orange | 249 |
| earth | 800 |
| yellow | 273 |
| green | 800 |
| teal | 800 |
| blue | 737 |
| purple | 221 |
| mono | 241 |
| **합계** | **4,620** |

이 데이터는 기존의 임시 이미지 목록을 대체한다. 각 레코드는 원본의 `thumbPath`, `thumbDigest`, 영화 제목과 슬러그, 공간 메타, 팔레트의 HEX 및 비율을 그대로 포함한다.

## 표시 검증

업로드된 정본 매니페스트를 연결한 뒤 Red, Green, Mono의 상세 화면을 각각 확인했다. 각 화면은 원본 프레임의 영화명·공간 메타·팔레트 수와 실제 스틸을 표시했으며, Red는 499개, Green은 800개, Mono는 241개의 수집된 원본 프레임을 순서대로 제공한다. 첫 진입에서는 24개를 표시하고 스크롤 감지와 `원본 프레임 더 보기`로 이후 프레임을 같은 원본 순서로 추가한다.

Red 상세 페이지에서 `원본 프레임 더 보기`를 실행한 결과 표시 수가 24개에서 48개로 증가했고, 첫 프레임과 25번째 프레임이 모두 `/manus-storage/`의 업로드된 원본 자산 경로를 사용함을 확인했다.
