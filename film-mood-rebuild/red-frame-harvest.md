# Red 원본 프레임 수집 기록

원본 Red 페이지가 최초 로드에서 DOM에 렌더한 프레임은 20개이며, 실제 이미지 경로는 `https://img.yeguozi.com/thumbs/480/...` 형식이다. 첫 프레임의 표시 순서는 다음과 같다.

| 순서 | 영화 | 원본 프레임 경로 |
| --- | --- | --- |
| 1 | Paris, Texas (1984) · Mirror | `https://img.yeguozi.com/thumbs/480/%E5%BE%B7%E5%B7%9E%E5%B7%B4%E9%BB%8E%281984%29/0048.webp?sid=1302061-0048&dig=fae9187d67ef&tv=4&rv=4` |
| 2 | The Grand Budapest Hotel (2014) · Hallway · Rug | `https://img.yeguozi.com/thumbs/480/%E5%B8%83%E8%BE%BE%E4%BD%A9%E6%96%AF%E5%A4%A7%E9%A5%AD%E5%BA%97%282014%29/0020.webp?sid=1383-0020&dig=f6b4ca1ca2df&tv=4&rv=4` |
| 3 | The Grand Budapest Hotel (2014) · Rug · Desk | `https://img.yeguozi.com/thumbs/480/%E5%B8%83%E8%BE%BE%E4%BD%A9%E6%96%AF%E5%A4%A7%E9%A5%AD%E5%BA%97%282014%29/0028.webp?sid=1383-0028&dig=3d9d8a19a99c&tv=4&rv=4` |
| 4 | Raise the Red Lantern (1991) · Bedroom · Bed · Lamp | `https://img.yeguozi.com/thumbs/480/%E5%A4%A7%E7%BA%A2%E7%81%AF%E7%AC%BC%E9%AB%98%E9%AB%98%E6%8C%82%281991%29/0013.webp?sid=2522-0013&dig=7cf8f6fe9549&tv=4&rv=4` |
| 5 | The Vertical Ray of the Sun (2000) | `https://img.yeguozi.com/thumbs/480/%E5%A4%8F%E5%A4%A9%E7%9A%84%E6%BB%8B%E5%91%B3%282000%29/The_Vertical_Ray_of_the_Sun_39.webp?sid=1299986-The_Vertical_Ray_of_the_Sun_39&dig=a96b7186070a&tv=4` |
| 6 | Laurence Anyways (2012) | `https://img.yeguozi.com/thumbs/480/%E5%8F%8C%E9%9D%A2%E5%8A%B3%E4%BC%A6%E6%96%AF%282012%29/0027.webp?sid=4838667-0027&dig=ed60484c1087&tv=4` |
| 7 | Raise the Red Lantern (1991) · Bedroom · Lamp · Bed | `https://img.yeguozi.com/thumbs/480/%E5%A4%A7%E7%BA%A2%E7%81%AF%E7%AC%BC%E9%AB%98%E9%AB%98%E6%8C%82%281991%29/0037.webp?sid=2522-0037&dig=f4ae8773f553&tv=4` |
| 8 | Raise the Red Lantern (1991) · Bedroom · Bed · Lamp | `https://img.yeguozi.com/thumbs/480/%E5%A4%A7%E7%BA%A2%E7%81%AF%E7%AC%BC%E9%AB%98%E9%AB%98%E6%8C%82%281991%29/0028.webp?sid=2522-0028&dig=06088bcd8374&tv=4` |

원본 화면은 스크롤에 따라 프레임을 추가로 지연 로드한다. 최종 목표는 499개 전체의 주소, 영화명, 순서 및 원본 팔레트를 수집해 동일 순서로 렌더링하는 것이다.

## 원본 화면에서 추가 확인된 연속 프레임

| 순서 | 영화 | 원본 프레임 경로 | 원본 팔레트 |
| --- | --- | --- | --- |
| 9 | Cries and Whispers (1972) · Living room · Chair · Curtain | `https://img.yeguozi.com/thumbs/%E5%91%BC%E5%96%8A%E4%B8%8E%E7%BB%86%E8%AF%AD%281972%29/0005.webp?sid=1296147-0005&dig=660510c42771&tv=4` | `#8E8A86 #18090B #37090A #4C0609 #5D090A #4F261C #6B140F #5F4339 #6D554D #75665F` |
| 10 | The Grand Budapest Hotel (2014) · Window | `https://img.yeguozi.com/thumbs/%E5%B8%83%E8%BE%BE%E4%BD%A9%E6%96%AF%E5%A4%A7%E9%A5%AD%E5%BA%97%282014%29/0019.webp?sid=1383-0019&dig=4f01f93a780e&tv=4` | `#753B2A #7A4339 #775056 #9D5743 #9B5B68 #B1695A #C27971 #D3897B #D78C8A #E49E9A` |
| 11 | Cries and Whispers (1972) · Living room · Chair · Curtain | `https://img.yeguozi.com/thumbs/%E5%91%BC%E5%96%8A%E4%B8%8E%E7%BB%86%E8%AF%AD%281972%29/0004.webp?sid=1296147-0004&dig=aea2ad726766&tv=4` | `#300605 #3C0504 #422115 #550806 #553A2B #674434 #6F5C4D #877D6C #0E0405 #470304` |
| 12 | Hero (2002) · Window | `https://img.yeguozi.com/thumbs/%E8%8B%B1%E9%9B%84%282002%29/0009.webp?sid=1306123-0009&dig=52fe7bd76ccd&tv=4` | `#1F0E04 #321B0C #3E1707 #471405 #5E1706 #6C220A #851D0A #812B0E #8E0A04 #9B3512` |
| 13 | The Royal Tenenbaums (2001) · Wall art · Lamp | `https://img.yeguozi.com/thumbs/%E5%A4%A9%E6%89%8D%E4%B8%80%E6%97%8F%EF%BC%882001%EF%BC%89/0009.webp?sid=1892-0009&dig=3ee3aa5f3590&tv=4` | `#080503 #11100C #440A02 #541005 #621508 #711A0B #723B16 #8A2814 #9D391F #A64C26` |
| 14 | Cries and Whispers (1972) · Living room · Chair · Curtain | `https://img.yeguozi.com/thumbs/%E5%91%BC%E5%96%8A%E4%B8%8E%E7%BB%86%E8%AF%AD%281972%29/0015.webp?sid=1296147-0015&dig=50aea4dda055&tv=4` | `#655554 #32070B #3D060B #4F070C #600D0F #552D22 #760D0E #573A2E #513F38 #76655F` |
| 15 | The Royal Tenenbaums (2001) · Hallway · Lamp · Rug | `https://img.yeguozi.com/thumbs/%E5%A4%A9%E6%89%8D%E4%B8%80%E6%97%8F%EF%BC%882001%EF%BC%89/0076.webp?sid=1892-0076&dig=66626bff3880&tv=4` | `#2B0C0A #370E09 #461108 #551808 #691D07 #822006 #923A12 #BB5329 #0C090C #1E090A` |
| 16 | Hero (2002) | `https://img.yeguozi.com/thumbs/%E8%8B%B1%E9%9B%84%282002%29/0024.webp?sid=1306123-0024&dig=c6948e6f09fb&tv=4` | `#503424 #5E2C1A #6C2512 #693B29 #8D220D #87351E #833F2B #A83412 #AA472B #A0543F` |
| 17 | In the Mood for Love (2000) · Curtain | `https://img.yeguozi.com/thumbs/%E8%8A%B1%E6%A0%B7%E5%B9%B4%E5%8D%8E%282000%29/0036.webp?sid=1291557-0036&dig=2c1cd8afa91f&tv=4` | `#0C0101 #300202 #450001 #5B0002 #6E0003 #522525 #810107 #A00612 #B72532 #B83E4A` |
| 18 | The Grand Budapest Hotel (2014) · Hallway | `https://img.yeguozi.com/thumbs/%E5%B8%83%E8%BE%BE%E4%BD%A9%E6%96%AF%E5%A4%A7%E9%A5%AD%E5%BA%97%282014%29/0016.webp?sid=1383-0016&dig=a62a830db5ca&tv=4` | `#8B0C09 #A81A0A #07050A #14070F #210A13 #340F1C #461320 #4A1B30 #6F0A0D #69282C` |
| 19 | The Royal Tenenbaums (2001) · Lamp · Mirror | `https://img.yeguozi.com/thumbs/%E5%A4%A9%E6%89%8D%E4%B8%80%E6%97%8F%EF%BC%882001%EF%BC%89/0028.webp?sid=1892-0028&dig=45ba654b823f&tv=4` | `#421206 #591907 #6C1404 #6C2F11 #7A2407 #8D0F04 #8C2F0B #89451E #9F3D0F #984317` |

## 전체 데이터 수집 경로

원본 페이지의 네트워크 요청을 확인해 공개 API `https://www.yeguozi.com/api/colors/red/stills?offset=0&limit=500`를 식별했다. 이 API 응답은 약 54KB이며, 페이지 헤더와 일치하는 499개 Red 프레임의 `id`, `path`, `thumbPath`, `thumbDigest`, 영화 슬러그·제목 및 프레임별 팔레트·비율을 포함한다. 이 응답을 단일 정본으로 사용해 현재 임시·혼합 갤러리를 교체한다.
