# 사이트가 실제로 쓰는 글자만 담은 웹폰트 서브셋을 만든다.
#
# Why: Pretendard 동적 서브셋 CDN 은 한글 때문에 웨이트마다 유니코드 구간이 쪼개진다.
# 실측(2026-10-28, 홈 1회 로드): woff2 44요청 522KB + CSS 21KB(해제 541KB).
# 쓰는 글자(477자)만 담으면 3웨이트 합계 136KB · 3요청이 된다.
#
# 주의 — 이 서브셋은 '지금 HTML 에 있는 글자'만 담는다.
# 글을 고치면 반드시 다시 돌려야 한다. 안 돌리면 새 글자가 시스템 폰트로 떨어진다.
#   python scripts/build-fonts.py          # 빌드
#   python scripts/build-fonts.py --check  # 누락 글자만 검사 (빌드 안 함)
#
# 원본은 받아서 쓰고 저장소에 두지 않는다. Pretendard 는 SIL OFL 1.1 이라
# 서브셋 재배포가 허용되며, 라이선스 전문을 assets/fonts/OFL.txt 로 함께 둔다.
import argparse
import glob
import html as H
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "assets", "fonts")

PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/Pretendard-{}.woff2"
OFL = "https://raw.githubusercontent.com/orioncactus/pretendard/main/LICENSE"
WEIGHTS = {"Regular": 400, "SemiBold": 600, "Bold": 700}

# Inter 는 라틴 display·라벨에만 쓴다. 가변(100–900) 라틴 서브셋 한 벌로 충분하다.
INTER = "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2"

# 본문에 안 보여도 넣어 두는 것: ASCII 전체(코드·URL·숫자 조합이 늘어나도 안전)
ASCII = "".join(chr(i) for i in range(0x20, 0x7F))


def site_charset():
    """HTML 에서 사람이 읽는 글자만 모은다. script/style 과 태그는 뺀다."""
    text = []
    for f in sorted(glob.glob(os.path.join(ROOT, "*.html")) +
                    glob.glob(os.path.join(ROOT, "projects", "*.html"))):
        s = open(f, encoding="utf-8").read()
        s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
        s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
        attrs = " ".join(re.findall(
            r'(?:alt|title|aria-label|placeholder)="([^"]*)"', s))
        text.append(re.sub(r"<[^>]+>", " ", s))
        text.append(attrs)
    chars = set(H.unescape(" ".join(text)))
    chars |= set(ASCII)
    return "".join(sorted(c for c in chars if c.isprintable() and not c.isspace()))


def coverage(path):
    from fontTools.ttLib import TTFont
    return set(TTFont(path).getBestCmap().keys())


def check():
    want = site_charset()
    missing_all = {}
    for name in WEIGHTS:
        p = os.path.join(FONT_DIR, f"Pretendard-{name}.subset.woff2")
        if not os.path.exists(p):
            print(f"  !! {os.path.basename(p)} 없음 — 먼저 빌드하십시오")
            return 1
        cmap = coverage(p)
        missing = [c for c in want if ord(c) not in cmap]
        if missing:
            missing_all[name] = missing
    if missing_all:
        for name, m in missing_all.items():
            print(f"  !! Pretendard-{name}: 서브셋에 없는 글자 {len(m)}자 → {''.join(m[:40])}")
        print("  python scripts/build-fonts.py 로 다시 만드십시오.")
        return 1
    print(f"  OK  글자 {len(want)}자가 3웨이트 모두에 있습니다.")
    return 0


def build():
    os.makedirs(FONT_DIR, exist_ok=True)
    charset = site_charset()
    txt = os.path.join(FONT_DIR, "_charset.txt")
    open(txt, "w", encoding="utf-8", newline="").write(charset)
    print(f"  글자 {len(charset)}자 (한글 {sum(1 for c in charset if '가' <= c <= '힣')}자)")

    if not os.path.exists(os.path.join(FONT_DIR, "OFL.txt")):
        urllib.request.urlretrieve(OFL, os.path.join(FONT_DIR, "OFL.txt"))
        print("  OFL.txt 내려받음")

    total = 0
    for name in WEIGHTS:
        src = os.path.join(FONT_DIR, f"_src-{name}.woff2")
        if not os.path.exists(src):
            urllib.request.urlretrieve(PRETENDARD.format(name), src)
        out = os.path.join(FONT_DIR, f"Pretendard-{name}.subset.woff2")
        subprocess.run([sys.executable, "-m", "fontTools.subset", src,
                        f"--text-file={txt}", "--flavor=woff2",
                        "--layout-features=*", "--no-hinting", "--desubroutinize",
                        f"--output-file={out}"], check=True, capture_output=True)
        total += os.path.getsize(out)
        print(f"  Pretendard-{name}.subset.woff2  {os.path.getsize(out):>7,} bytes")
        os.remove(src)

    # Inter — 라틴만 쓰므로 한글을 뺀 글자만 넘긴다. 가변 축(100–900)은 유지.
    latin = os.path.join(FONT_DIR, "_latin.txt")
    open(latin, "w", encoding="utf-8", newline="").write(
        "".join(c for c in charset if ord(c) < 0x2500))
    src = os.path.join(FONT_DIR, "_src-Inter.woff2")
    if not os.path.exists(src):
        req = urllib.request.Request(INTER, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(src, "wb") as f:
            f.write(r.read())
    out = os.path.join(FONT_DIR, "Inter-latin.subset.woff2")
    subprocess.run([sys.executable, "-m", "fontTools.subset", src,
                    f"--text-file={latin}", "--flavor=woff2",
                    "--layout-features=*", "--no-hinting",
                    f"--output-file={out}"], check=True, capture_output=True)
    total += os.path.getsize(out)
    print(f"  Inter-latin.subset.woff2  {os.path.getsize(out):>7,} bytes")
    os.remove(src); os.remove(latin)

    os.remove(txt)
    print(f"  합계 {total:,} bytes ({total/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="누락 글자만 검사")
    a = ap.parse_args()
    sys.exit(check() if a.check else build())
