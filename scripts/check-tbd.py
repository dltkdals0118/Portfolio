# 아직 채워지지 않은 자리(`[확인 필요]`)를 전부 센다.
#
# Why: 사례 페이지에는 본인만 아는 값이 들어가는 자리가 있다 — 고른 이유, 치른 비용,
# 고객사 동의 여부. 그럴듯하게 채우면 틀린 채로 공개되고, 비워 두면 비어 있다는 것을
# 잊는다. 그래서 눈에 보이게 표시해 두고(`<span class="tbd">`), 발행 전에 여기서 센다.
#
# 이 스크립트는 막지 않는다. 몇 개가 남았는지 보여 줄 뿐이고, 남은 채로 올릴지는 사람이 정한다.
#
#   python scripts/check-tbd.py
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAT = re.compile(r'<span class="tbd">\[([^\]]*)\]</span>')


def context(text, pos, span=90):
    """그 자리가 어느 문장 안인지 — 태그를 걷어낸 앞뒤를 보여 준다."""
    head = re.sub(r"<[^>]+>", " ", text[max(0, pos - span):pos])
    tail = re.sub(r"<[^>]+>", " ", text[pos:pos + 40])
    return (" ".join(head.split())[-span:] + " ▸ " + " ".join(tail.split()))


total = 0
for path in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
    text = open(path, encoding="utf-8").read()
    hits = list(PAT.finditer(text))
    if not hits:
        continue
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    print("\n%s — %d곳" % (rel, len(hits)))
    for m in hits:
        print("  · " + context(text, m.start()))
    total += len(hits)

print("\n채워야 할 자리 %d곳." % total)
if total:
    print("전부 본인만 아는 값이다. 채우기 전에는 공개하지 않는 편이 낫다.")
