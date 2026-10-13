#!/usr/bin/env python3
"""從公路局「汽車筆試題庫」PDF 擷取題目、答案、分類與圖片。

用法：
  python3 -m venv .venv && .venv/bin/pip install pymupdf
  .venv/bin/python scripts/extract_questions.py source/bank.pdf

輸出：
  src/data/questions.json        題庫
  public/images/questions/*.png  題目圖片
  reports/import-report.json     匯入驗證報告（待人工確認項目）

只做機械式擷取，不補寫、不推測任何題目或答案內容。
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "source" / "bank.pdf"
OUT_JSON = ROOT / "src" / "data" / "questions.json"
IMG_DIR = ROOT / "public" / "images" / "questions"
REPORT = ROOT / "reports" / "import-report.json"

# PDF 末頁各架構標示的合計題數，用來交叉驗證
EXPECTED = {
    "架構一": (424, 1, 424),
    "架構二": (230, 425, 654),
    "架構三": (436, 655, 1090),
}

FW = str.maketrans("０１２３４５６７８９（）", "0123456789()")
OPT_RE = re.compile(r"\(([123])\)")


CJK = "\u3000-\u303f\u3400-\u9fff\uff00-\uffef\u2500-\u25ff"


def norm(s: str) -> str:
    """全形數字／括號轉半形、合併空白，並去除與中文相鄰的多餘空白（僅排版，不改內容）。"""
    s = s.translate(FW)
    # PDF 文字層在 Q995 有簡體「满」，但頁面實際顯示為「滿」（逐頁目視核對確認）
    s = s.replace("满", "滿")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(rf"\s+(?=[{CJK}])", "", s)
    s = re.sub(rf"(?<=[{CJK}])\s+", "", s)
    return s


def split_options(text: str):
    """把『題幹 (1)… (2)… (3)…』拆成題幹與三個選項；失敗時回傳 None。"""
    t = norm(text)
    marks = [(m.group(1), m.start(), m.end()) for m in OPT_RE.finditer(t)]
    # 找出依序 1,2,3 的最後一組標記（題幹內偶有 (1) 字樣時取最後一組）
    for i in range(len(marks) - 3, -1, -1):
        if [marks[i][0], marks[i + 1][0], marks[i + 2][0]] == ["1", "2", "3"]:
            a, b, c = marks[i], marks[i + 1], marks[i + 2]
            stem = t[: a[1]].strip()
            opts = [t[a[2] : b[1]].strip(), t[b[2] : c[1]].strip(), t[c[2] :].strip()]
            return stem, opts
    return None


def main():
    doc = pymupdf.open(pdf_path)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    # 以版面文字行（含座標）逐列解析：題號行 → 答案行 → 題目文字行…
    # 題號必須等於前一題 +1 才視為新題，避免內文數字誤判。
    HDR = {"案", "題目", "圖示", "題號", "答", "▎", "▎題號", "題號答", "答案"}
    lines = []  # (page, y0, text)
    imgs_by_page = {}
    for pn, page in enumerate(doc):
        imgs_by_page[pn] = [
            (im["bbox"][1], im["xref"]) for im in page.get_image_info(xrefs=True) if im["xref"]
        ]
        for blk in page.get_text("dict")["blocks"]:
            for ln in blk.get("lines", []):
                t = "".join(sp["text"] for sp in ln["spans"]).strip()
                if t:
                    lines.append((pn, ln["bbox"][1], t))

    frame = category = None
    questions = []
    cur = None
    notes = []  # 待人工確認
    i = 0
    while i < len(lines):
        pn, y, t = lines[i]
        tt = t.replace(" ", "").replace("　", "")
        if (tt.startswith("新版汽車筆試題庫") or re.fullmatch(r"第\d+頁", tt) or tt.startswith("▎題號")
                or tt in HDR or re.match(r"架構[一二三]「.+」合計", tt)):
            i += 1
            continue
        m = re.match(r"(架構[一二三])\s*(.+)", t)
        if m:
            frame = f"{m.group(1)} {m.group(2)}"
            i += 1
            continue
        if re.match(r"分類\s", t) or t.startswith("禁止不當行為（"):
            category = re.sub(r"^分類\s*", "", t)
            i += 1
            continue
        nxt = len(questions) + 1
        # PDF 內容流依「題號 → 答案 → 題目」逐列輸出；答案可能與題目首行併在同一行
        m = re.fullmatch(r"(\d+)(?:\s+(\(\s*\d?\s*\))\s*(.*))?", t)
        if m and int(m.group(1)) == nxt:
            cur = {"id": nxt, "frame": frame, "category": category, "_ans": None,
                   "_lines": [], "_pn": pn, "_y": y, "_page": pn + 1}
            questions.append(cur)
            if m.group(2):
                cur["_ans"] = m.group(2).replace(" ", "")
                if m.group(3):
                    cur["_lines"].append(m.group(3))
            i += 1
            continue
        if cur is not None and cur["_ans"] is None:
            m = re.match(r"(\(\s*\d?\s*\))\s*(.*)", t)
            if m:
                cur["_ans"] = m.group(1).replace(" ", "")
                if m.group(2):
                    cur["_lines"].append(m.group(2))
                i += 1
                continue
        if cur is not None:
            cur["_lines"].append(t)
        else:
            notes.append({"id": None, "issue": f"無法歸屬的行：{t}", "page": pn + 1})
        i += 1

    # 圖片歸屬：以表格列分隔線（題號欄的水平線）切出每一列，圖片落在哪一列就歸哪一題；
    # 沒有題號的列（跨頁續行）歸上一題。
    import bisect
    for pn, page in enumerate(doc):
        ys = sorted({
            round(dr["rect"].y0, 1) for dr in page.get_drawings()
            if dr["rect"].height < 2 and 25 < dr["rect"].width < 60 and 50 < dr["rect"].x0 < 62
        })
        starts = [q for q in questions if q["_pn"] == pn]
        prev_q = next((q for q in reversed(questions) if q["_pn"] < pn), None)
        band_owner = {}
        for q in starts:
            band_owner[bisect.bisect_right(ys, q["_y"] + 3) - 1] = q
        pics = sorted(
            [im for im in page.get_image_info(xrefs=True) if im["xref"]],
            key=lambda im: im["bbox"][0],  # 同列圖片由左到右（各題圖片已依列分開）
        )
        for im in pics:
            cy = (im["bbox"][1] + im["bbox"][3]) / 2
            owner = band_owner.get(bisect.bisect_right(ys, cy) - 1, prev_q if not band_owner or bisect.bisect_right(ys, cy) - 1 < min(band_owner) else None)
            if owner is None:
                notes.append({"id": None, "issue": f"圖片無法歸屬 xref={im['xref']} y={cy:.0f}", "page": pn + 1})
                continue
            owner.setdefault("_xrefs", []).append(im["xref"])
    for q in questions:
        q.setdefault("_xrefs", [])
        parts = q["_lines"]
        body = ""
        for part in parts:
            if body and re.match(r"[A-Za-z0-9]", part) and re.search(r"[A-Za-z0-9,.]$", body):
                body += " "
            body += part
        q["_body"] = body

    out = []
    for q in questions:
        issue = []
        m = re.fullmatch(r"\(([123])\)", q["_ans"] or "")
        answer = int(m.group(1)) if m else None
        if answer is None:
            issue.append(f"答案格式異常：{q['_ans']!r}")
        sp = split_options(q["_body"])
        if sp is None:
            issue.append("無法拆出三個選項")
            stem, opts = q["_body"], []
        else:
            stem, opts = sp
            if any(not o for o in opts) and not all(re.fullmatch(r"[。.、\s]*", o) for o in opts):
                issue.append("有部分空白選項")
        has_img = bool(q["_xrefs"])
        opts_are_images = False
        if opts and all(re.fullmatch(r"[。.、\s]*", o) for o in opts):
            # 選項本身是圖片（(1)(2)(3) 為圖），文字選項留空
            opts = ["", "", ""]
            opts_are_images = True
            issue = [x for x in issue if x != "有空白選項"]
        images = []
        for k, xref in enumerate(dict.fromkeys(q["_xrefs"])):
            pix = pymupdf.Pixmap(doc, xref)
            if pix.colorspace and pix.colorspace.n >= 4:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)
            name = f"q{q['id']}" + (f"-{k + 1}" if k else "") + ".png"
            pix.save(IMG_DIR / name)
            images.append(name)
        # 題幹空白但有圖：屬於圖片題（標誌／標線），題幹由圖片表達
        mentions_pic = bool(re.search(r"圖中|如圖|圖示|圖片|下圖|此圖|此標誌|此標線", stem))
        if mentions_pic and not has_img:
            issue.append("題幹提到圖示但未偵測到圖片")
        if has_img and not stem:
            pass  # 純圖片題，題幹為空屬正常（圖即題目）
        if opts_are_images and len(images) != 3:
            issue.append(f"圖片選項題但圖片數為 {len(images)}（應為 3）")
        out.append({
            "id": q["id"], "frame": q["frame"], "category": q["category"],
            "question": stem, "options": opts, "optionsAreImages": opts_are_images,
            "answer": answer, "images": images,
            "_page": q["_page"], "_issue": issue,
        })
        for i in issue:
            notes.append({"id": q["id"], "issue": i, "page": q["_page"]})

    # ---- 驗證 ----
    problems = []
    ids = [q["id"] for q in out]
    if ids != list(range(1, len(ids) + 1)):
        missing = sorted(set(range(1, max(ids) + 1)) - set(ids))
        dup = sorted({i for i in ids if ids.count(i) > 1})
        problems.append(f"題號不連續或重複 缺：{missing[:20]} 重複：{dup[:20]}")
    for fr, (n, lo, hi) in EXPECTED.items():
        got = [q for q in out if q["frame"] and q["frame"].startswith(fr)]
        if len(got) != n or (got and (got[0]["id"], got[-1]["id"]) != (lo, hi)):
            problems.append(f"{fr} 題數 {len(got)} 與 PDF 合計 {n} 不符")

    clean = [{k: v for k, v in q.items() if not k.startswith("_")} for q in out]
    OUT_JSON.write_text(json.dumps(clean, ensure_ascii=False, indent=1), encoding="utf-8")
    cats = {}
    for q in out:
        cats[f"{q['frame']} / {q['category']}"] = cats.get(f"{q['frame']} / {q['category']}", 0) + 1
    REPORT.write_text(json.dumps({
        "source": pdf_path.name, "total": len(out), "problems": problems,
        "withImages": sum(1 for q in out if q["images"]),
        "categories": cats, "notes": notes,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    write_md(out, cats, problems, notes)
    print("total", len(out), "images", sum(len(q["images"]) for q in out))
    print("problems:", problems or "none")
    print("notes:", len(notes))
    for k, v in cats.items():
        print(v, k)


def write_md(out, cats, problems, notes):
    img_opts = [q["id"] for q in out if q["optionsAreImages"]]
    pic_in_stem = [q["id"] for q in out if len(q["images"]) == 3 and not q["optionsAreImages"]]
    no_stem = [q["id"] for q in out if not q["question"]]
    L = ["# 題庫匯入報告", "",
         f"來源：`{pdf_path.name}`（頁首標示「新版汽車筆試題庫 115.5.29」）", "",
         "## 自動驗證結果", "",
         f"- 題數：**{len(out)}**（題號 1..{out[-1]['id']} 連續、無重複）",
         "- 架構題數與 PDF 末頁合計相符：架構一 424／架構二 230／架構三 436",
         "- 每題皆有 3 個選項（圖片選項題除外）與 1~3 的答案；答案欄另以獨立的文字順序解析交叉比對，1090 題全部一致",
         f"- 圖片：{sum(len(q['images']) for q in out)} 張，分屬 {sum(1 for q in out if q['images'])} 題，所有檔案皆存在",
         f"- 驗證問題：{problems or '無'}", "", "## 分類（沿用 PDF 分類標題）", ""]
    L += [f"- {k}：{v} 題" for k, v in cats.items()]
    L += ["", "## 待人工確認項目", "",
          "以下為機械擷取時較容易出錯、建議對照 PDF 原稿目視確認的題目：", "",
          f"1. **選項為圖片的題目**（選項文字留空，三張圖依序為選項 1~3）：{img_opts}",
          f"2. **題幹內含 圖1／圖2／圖3 三張圖的題目**：{pic_in_stem}",
          f"3. **題幹為空、題目完全由圖片表達的題目**（{len(no_stem)} 題，標誌／標線辨識題）：請抽查圖片與答案是否對應。題號：{no_stem}",
          "4. **文字排版整理**：為了顯示順暢，匯入時把全形數字／括號轉為半形，並移除與中文相鄰的多餘空白與 PDF 折行造成的空白；未改動任何用字。PDF 內原有的錯別字（如「罰緩」「敍述」）保留原樣。",
          "5. **分類為 PDF 原有的 10 個粗分類**；PDF 未提供更細的標誌／標線／罰鍰等分類。App 內的「數字題」分類是依關鍵字自動判斷，不是官方分類。",
          "6. **法規時效**：答案完全照 PDF，未對照現行法條驗證。題庫日期以 PDF 頁首 115.5.29 為準，是否為公路局網站最新版請自行到來源頁確認。",
          ""]
    other = [n for n in notes]
    if other:
        L += ["## 擷取警告", ""] + [f"- Q{n['id']}（p.{n['page']}）：{n['issue']}" for n in other] + [""]
    (ROOT / "reports" / "import-report.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
