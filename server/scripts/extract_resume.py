import sys
import json
import re
import cv2
import numpy as np
from PIL import Image
import pytesseract
import platform

# Specify Tesseract path for Windows if it's installed in the default location
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ─── OCR ─────────────────────────────────────────────────────────────────────

def preprocess_image(image: Image.Image) -> Image.Image:
    img = np.array(image.convert("RGB"))
    h, w = img.shape[:2]
    if w < 1400:
        scale = 1400 / w
        img = cv2.resize(img, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Increase contrast to improve OCR accuracy for numbers and thin text
    gray = cv2.normalize(gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    return Image.fromarray(cv2.filter2D(gray, -1, kernel))

def run_ocr(image: Image.Image) -> str:
    return pytesseract.image_to_string(preprocess_image(image), config="--psm 3 -l eng")

# ─── Source detection ────────────────────────────────────────────────────────

def detect_source(text: str) -> str:
    # Priority 1: specific URL bar domains (most reliable)
    if "recruiter.shine.com" in text:
        return "Shine"
    if "resdex.naukri.com" in text:
        return "Naukri"
    t = text.lower()
    # Priority 2: page-unique UI elements
    if "naukri talent cloud" in t or "send nvite" in t or "set reminder" in t:
        return "Naukri"
    if "find candidates" in t and "shine" in t:
        return "Shine"
    # Priority 3: generic keywords (may appear in browser tabs)
    if "naukri" in t:
        return "Naukri"
    if "shine" in t:
        return "Shine"
    return "Unknown"

# ─── Expanded city list ───────────────────────────────────────────────────────

CITIES = [
    # Tamil Nadu districts & cities
    "Chennai", "Coimbatore", "Madurai", "Trichy", "Tiruchirappalli",
    "Tirunelveli", "Salem", "Erode", "Tiruppur", "Vellore",
    "Thanjavur", "Thoothukudi", "Tuticorin", "Dindigul", "Kanchipuram",
    "Cuddalore", "Villupuram", "Ramanathapuram", "Virudhunagar",
    "Namakkal", "Karur", "Nagapattinam", "Krishnagiri", "Dharmapuri",
    "Sivaganga", "Theni", "Perambalur", "Ariyalur", "Pudukottai",
    "Tenkasi", "Tiruvarur", "Ranipet", "Tirupattur", "Chengalpattu",
    "Kallakurichi", "Ooty", "Puducherry", "Pondicherry",
    # Kerala
    "Kochi", "Thrissur", "Thiruvananthapuram", "Kozhikode", "Kollam",
    "Kannur", "Palakkad", "Alappuzha", "Thrissur",
    # Andhra Pradesh / Telangana
    "Hyderabad", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore",
    "Tirupati", "Warangal", "Karimnagar", "Rajahmundry",
    # Karnataka
    "Bangalore", "Bengaluru", "Mysuru", "Mysore", "Mangalore",
    "Hubli", "Dharwad", "Bellary",
    # Maharashtra
    "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad",
    "Solapur", "Kolhapur", "Navi Mumbai",
    # North India
    "Delhi", "Noida", "Gurgaon", "Gurugram", "Faridabad",
    "Ghaziabad", "Meerut", "Agra", "Varanasi", "Kanpur",
    "Lucknow", "Allahabad", "Prayagraj", "Jaipur", "Jodhpur",
    "Kota", "Chandigarh", "Amritsar", "Ludhiana", "Jalandhar",
    # West / East India
    "Kolkata", "Howrah", "Patna", "Ranchi", "Jamshedpur",
    "Bhubaneswar", "Cuttack", "Guwahati", "Raipur", "Bhopal",
    "Indore", "Jabalpur",
    # Gujarat
    "Ahmedabad", "Surat", "Vadodara", "Rajkot",
]

CITY_RE = re.compile(
    r"\b(" + "|".join(sorted(set(CITIES), key=len, reverse=True)) + r")\b",
    re.IGNORECASE
)

# ─── Degree list ─────────────────────────────────────────────────────────────

DEGREE_LIST = [
    "B.Tech/B.E", "B.Tech", "B.E", "BE", "BTech",
    "B.C.A.", "B.C.A", "BCA",
    "B.SC.", "B.SC", "B.Sc", "BSc",
    "B.Com", "B.A", "B.B.A", "BBA",
    "M.B.A", "MBA",
    "M.C.A", "MCA",
    "M.Tech", "M.Sc", "M.Com", "M.A",
    "Ph.D", "Diploma",
]
DEGREE_LIST_SORTED = sorted(DEGREE_LIST, key=len, reverse=True)
DEGREE_RE = re.compile(
    r"\b(" + "|".join(re.escape(d) for d in DEGREE_LIST_SORTED) + r")\b",
    re.IGNORECASE
)

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# ─── Phone helpers ────────────────────────────────────────────────────────────

def extract_phone(text: str) -> str:
    """
    Extract a 10-digit Indian mobile number.
    Handles: +91-XXXXXXXXXX, +91 XXXXXXXXXX, plain XXXXXXXXXX.
    Includes OCR correction for common digit swaps (O->0, l->1, etc.)
    """
    # Fix common OCR mistakes in phone digits
    correction_map = str.maketrans('OBolISZzGgQq', '080115226999')
    
    m = re.search(r'\+91[-\s]*([\d\s\-OBolISZzGgQq]{9,15})', text)
    if m:
        candidate = m.group(1).translate(correction_map)
        digits = re.sub(r'\D', '', candidate)
        if len(digits) >= 10:
            candidate = digits[-10:]
            if candidate[0] in '6789':
                return candidate
            for start in range(len(digits) - 9):
                seg = digits[start:start+10]
                if seg[0] in '6789':
                    return seg

    # Look for mostly digit 10-char sequences with OCR swaps
    for m in re.finditer(r'(?<![=&/:?\w])([\w\-]{10,12})(?!\w)', text):
        raw = re.sub(r'\-', '', m.group(1))
        if len(raw) == 10:
            digit_count = sum(1 for c in raw if c.isdigit())
            if digit_count >= 6: # Mostly digits
                fixed = raw.translate(correction_map)
                if fixed.isdigit() and fixed[0] in '6789':
                    return fixed

    for m in re.finditer(r'(?<![=&/:?\d])(\d{10})(?!\d)', text):
        if m.group(1)[0] in '6789':
            return m.group(1)

    for m in re.finditer(r'(?<![=&/:?\d])(\d{10})(?!\d)', text):
        return m.group(1)

    return "nil"

# ─── CamelCase splitter for OCR-merged names ─────────────────────────────────

def split_camel(text: str) -> str:
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    text = re.sub(r'([A-Z])(?=[A-Z][a-z]|[A-Z]$)', r'\1 ', text)
    text = re.sub(r'^([A-Z]{4,})([A-Z])$', r'\1 \2', text.strip())
    return ' '.join(text.split())

# ─── Generic name validator ───────────────────────────────────────────────────

_ALWAYS_SKIP = {
    "not applicable", "student intern", "fresher", "volunteer",
    "profile details", "attached resume", "summary", "education",
    "skills", "experience", "no similar", "similar candidates",
    "view all", "view al", "immediate joiner", "notice",
    "comment", "download resume", "whatsapp", "active",
    "candidate looking", "yes no", "response likelihood",
    "proactive", "profile", "resume", "naukri", "shine",
    "send nvite", "set reminder", "add to", "forward",
    "schedule", "no comments", "add comments", "save",
    "jobs", "resdex", "reports", "recent", "search",
}

def is_valid_name(text: str) -> bool:
    t = text.strip()
    if not t or len(t) < 2 or len(t) > 55:
        return False
    if re.search(r'[\d<>=%|/\\@\[\]{}]', t):
        return False
    if any(skip in t.lower() for skip in _ALWAYS_SKIP):
        return False
    if not t[0].isupper():
        return False
    return True

_PROFILE_ROLE_RE = re.compile(
    r'Not Applicable|Student\s*-|Volunteer\s*-|Student Intern'
    r'|\d+\s*Yr\s*\d*\s*Month|Rs\.\s*0|Immediate\s*Joiner'
    r'|Profile Details|Education|Summary',
    re.IGNORECASE
)

# ─── Naukri extraction ────────────────────────────────────────────────────────

_NAUKRI_UI = {
    "naukri","resdex","jobs","reports","recent","search","print","profile",
    "forward","save","add to","send nvite","schedule","reminder",
    "no comments","add comments","available","highest degree","pref.",
    "prev","next","call candidate","whatsapp","fresher","profiles found",
    "job search","jobs & responses","talent cloud","report profile",
}

def extract_naukri(text: str) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name = "nil"

    m = re.search(r'profiles?\s*found\s*[>»]\s*([A-Za-z][^\n<>]{1,40})', text, re.IGNORECASE)
    if m:
        raw = m.group(1).strip().rstrip('.')
        raw = split_camel(raw)
        if is_valid_name(raw):
            name = raw

    if name == "nil":
        for line in lines:
            m = re.match(r'^([A-Za-z][A-Za-z\s]{2,40}?)(?:\s*[\[\(]?\s*[Ss]ave|\s{3,})', line)
            if m:
                raw = split_camel(m.group(1).strip())
                lower = raw.lower()
                if is_valid_name(raw) and not any(s in lower for s in _NAUKRI_UI):
                    name = raw
                    break

    if name == "nil":
        for line in lines:
            m = re.match(r'^([A-Z][A-Z\s]{3,}[A-Z])\b', line)
            if m:
                raw = m.group(1).strip()
                if not re.search(r'\d', raw) and len(raw) >= 4:
                    lower = raw.lower()
                    if not any(s in lower for s in _NAUKRI_UI):
                        name = raw.title()
                        break

    if name == "nil":
        for line in lines:
            raw = split_camel(line.strip())
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Za-z][a-z]*)*(?:\s+[A-Z])?$', raw) \
                    and not re.search(r'\d', raw) and 4 <= len(raw) <= 50:
                lower = raw.lower()
                if is_valid_name(raw) and not any(s in lower for s in _NAUKRI_UI):
                    name = raw
                    break

    location = "nil"
    for line in lines:
        m = CITY_RE.search(line)
        if m:
            location = m.group(1)
            break

    degree = college = "nil"
    for line in lines:
        if re.search(r"highest\s+degree", line, re.IGNORECASE):
            rest = re.sub(r"(?i)highest\s+degree\s*", "", line).strip()
            matched = False
            for deg in DEGREE_LIST_SORTED:
                m = re.match(re.escape(deg), rest, re.IGNORECASE)
                if m:
                    degree = rest[: m.end()].strip().rstrip(".")
                    college_raw = rest[m.end():].strip()
                    college_raw = _clean_college(college_raw)
                    college = college_raw or "nil"
                    matched = True
                    break

            if not matched and rest:
                college_raw = _clean_college(rest)
                college = college_raw if college_raw else "nil"
                degree = "nil"
            break

    phone = extract_phone(text)

    email = "nil"
    m = EMAIL_RE.search(text)
    if m:
        email = m.group(0)

    return dict(Name=name, Location=location, College=college,
                Degree=degree, Phone=phone, Email=email)


def _clean_college(raw: str) -> str:
    raw = re.sub(r",?\s*\d{4}\s*$", "", raw).strip()
    raw = re.sub(r"\s*:\s*", ".", raw)
    raw = raw.rstrip(".,").strip()
    raw = re.sub(r"([a-z\.])([A-Z])", lambda x: x.group(1) + " " + x.group(2), raw)
    return raw

# ─── Shine extraction ─────────────────────────────────────────────────────────

_SHINE_UI = {
    "shine","home","find candidates","jobs","email","sms","ivr",
    "folders","workspace","admin","not applicable","volunteer",
    "notice","profile details","attached resume","summary",
    "comment","download resume","whatsapp","request for updated resume",
    "active","similar candidates","view al","view all",
    "did you like","i'm interested","don't show","candidate looking",
    "orphanage","outreach","recruiter.shine","national service",
    "student intern","student - nil","proactive","response likelihood",
    "immediate joiner","education","skills","experience",
}

def extract_shine(text: str) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name = "nil"

    m = re.search(r'([A-Za-z][A-Za-z\s]{1,35}?)\s*[\|]\s*\d+\s*Yr', text)
    if m:
        raw = split_camel(m.group(1).strip())
        if is_valid_name(raw) and not any(s in raw.lower() for s in _SHINE_UI):
            name = raw

    if name == "nil":
        for i, line in enumerate(lines):
            if _PROFILE_ROLE_RE.search(line) and i > 0:
                for back in range(1, min(4, i+1)):
                    candidate = split_camel(lines[i-back].strip())
                    if is_valid_name(candidate) and not any(s in candidate.lower() for s in _SHINE_UI):
                        name = candidate
                        break
                if name != "nil":
                    break

    if name == "nil":
        for line in lines[:50]:
            if "@" in line:
                before = line.split("@")[0].strip()
                raw = split_camel(before)
                if is_valid_name(raw) and not any(s in raw.lower() for s in _SHINE_UI):
                    if raw.isupper():
                        raw = raw.title()
                    name = raw
                    break

    if name == "nil":
        for line in lines[:60]:
            cleaned = re.sub(r"[\s©✓✔\u2713\u2714]+$", "", line).strip()
            raw = split_camel(cleaned)
            if re.match(r'^[A-Z][a-z]+(?:\s+[a-zA-Z][a-zA-Z]*)+ $|^[A-Z][a-z]+(?:\s+[a-zA-Z][a-zA-Z]*)+$', raw) \
                    and not re.search(r'\d', raw) and 3 <= len(raw) <= 50:
                if is_valid_name(raw) and not any(s in raw.lower() for s in _SHINE_UI):
                    name = raw
                    break
            if re.match(r'^[A-Z][a-z]{3,}$', raw) and is_valid_name(raw) \
                    and not any(s in raw.lower() for s in _SHINE_UI):
                name = raw
                break

    location = "nil"
    for line in lines:
        m = CITY_RE.search(line)
        if m:
            location = m.group(1)
            break

    degree = "nil"
    for line in lines:
        m = DEGREE_RE.search(line)
        if m:
            degree = m.group(1).rstrip(".")
            break

    college = "nil"
    email = "nil"

    phone = extract_phone(text)

    return dict(Name=name, Location=location, College=college,
                Degree=degree, Phone=phone, Email=email)

# ─── Main extract ─────────────────────────────────────────────────────────────

def extract_from_image(image: Image.Image, filename: str) -> dict:
    text = run_ocr(image)
    source = detect_source(text)

    if source == "Naukri":
        fields = extract_naukri(text)
    elif source == "Shine":
        fields = extract_shine(text)
    else:
        n = extract_naukri(text)
        s = extract_shine(text)
        ns = sum(1 for v in n.values() if v != "nil")
        ss = sum(1 for v in s.values() if v != "nil")
        fields = n if ns >= ss else s
        source = "Naukri (guessed)" if ns >= ss else "Shine (guessed)"

    fields["Source"] = source
    fields["File"] = filename
    return fields

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
        
    results = []
    # sys.argv contains script_name, path1, path2...
    for image_path in sys.argv[1:]:
        try:
            img = Image.open(image_path)
            # Use just the basename for the 'File' field so it looks clean
            import os
            basename = os.path.basename(image_path)
            # Usually the node script adds a timestamp prefix, let's remove it for display if needed
            # but we can just pass the basename and Node can override it.
            fields = extract_from_image(img, basename)
            results.append(fields)
        except Exception as e:
            results.append({"error": str(e), "File": image_path})

    print(json.dumps(results))

if __name__ == "__main__":
    main()
