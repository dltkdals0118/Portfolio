# 안과 앱 화면에서 실제 인물 얼굴을 걷어낸다.
#
# Why: 커버·OG 에 내부 인물 얼굴을 쓰지 않는다(메모 no-staff-photos-on-covers).
# 퇴사 여부를 우리가 알 수 없고, 커버는 목록·공유 카드·검색 결과에 계속 남는다.
# 「이미 라이브에 있다」는 근거가 되지 않는다(메모 client-case-study-risk).
#
# 두 가지를 한다.
#  1) 홈 4종 — 「와커스 안과 TV」부터 아래는 마케팅 영역이라 잘라낸다.
#     의료진 썸네일·후기 배너 얼굴이 함께 빠지고, 대표번호·지점명도 같이 빠진다.
#     기획 근거(진료카드·다음 진료·내 차트)는 전부 잘리는 지점 위에 있다.
#  2) 마이차트 — 집도의 원형 사진을 빈 아바타로 바꾼다.
#
# 원본은 Figma 에서 다시 받을 수 있으므로 이 스크립트는 덮어쓴다.
#   python scripts/redact-faces.py
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)

# 유튜브 아이콘(빨강)의 행을 찾아 그 위에서 자른다 — 좌표를 손으로 박지 않는다.
HOMES = ["eye-home.webp", "eye-home-booked.webp", "eye-home-none.webp", "eye-home-postop.webp"]
MARGIN_ABOVE = 30

AVATAR = ("eye-chart.webp", (54.5, 171.5), 23.5)


def youtube_row(im):
    px = im.load()
    w, h = im.size
    for y in range(600, h):
        run = 0
        for x in range(16, 80):
            r, g, b = px[x, y]
            if r > 170 and g < 70 and b < 70:
                run += 1
                if run >= 7:
                    return y
            else:
                run = 0
    return None


def crop_marketing_tail():
    for name in HOMES:
        p = A(name)
        im = Image.open(p).convert("RGB")
        y = youtube_row(im)
        if y is None:
            print(f"  -- {name}: 자를 지점을 못 찾음, 건너뜀")
            continue
        cut = y - MARGIN_ABOVE
        out = im.crop((0, 0, im.width, cut))
        out.save(p, "WEBP", lossless=True, method=6)
        print(f"  {name:<26}{im.size} → {out.size}   y={cut} 아래 제거")


def blank_avatar():
    name, (cx, cy), r = AVATAR
    p = A(name)
    im = Image.open(p).convert("RGB")
    px = im.load()
    tone = px[int(cx - r + 4), int(cy - 8)]          # 원 안쪽 여백 색을 그대로 쓴다
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tone)
    # 사람이 특정되지 않는 기본 아바타 글리프
    head_r = r * 0.34
    d.ellipse([cx - head_r, cy - r * 0.52, cx + head_r, cy - r * 0.52 + head_r * 2], fill=(255, 255, 255))
    d.pieslice([cx - r * 0.66, cy + r * 0.02, cx + r * 0.66, cy + r * 1.30], 180, 360, fill=(255, 255, 255))
    im.save(p, "WEBP", lossless=True, method=6)
    print(f"  {name:<26}아바타 원형 사진 → 빈 아바타 (바탕 {tone})")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    crop_marketing_tail()
    blank_avatar()
