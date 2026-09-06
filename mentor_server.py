#!/usr/bin/env python3
"""FunAl mentor server.

Serves the tutorial (index.html) and proxies "ask the mentor" requests to Kimi
(Moonshot, OpenAI-compatible API). The API key lives only in your environment
or a git-ignored .env file on your machine; it never reaches the browser.

Usage:
    python3 mentor_server.py                 # http://127.0.0.1:8765, AI on if a key is found
    python3 mentor_server.py --no-ai         # serve the tutorial only
    python3 mentor_server.py --env-file ~/.config/funal/.env

Standard library only. Python 3.8+.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_BASE_URL = "https://api.moonshot.cn/v1"
DEFAULT_MODEL = "kimi-k2.6"
PREFERRED_MODELS = ["kimi-k3", "kimi-k2.6", "kimi-k2.5", "moonshot-v1-auto"]
PROMPT_FILE = ROOT / "mentor_prompt.md"
MAX_QUESTION_CHARS = 2000
MAX_HISTORY = 8
MAX_TOKENS = 4000  # Kimi reasoning models spend ~600 tokens thinking before they answer

FALLBACK_PROMPT = (
    "你是一位耐心的动态规划启蒙导师。学习者正在做一个互动教程。"
    "规则：先用一句话复述学习者的困惑；绝不直接给出答案或公式；"
    "每次只用一个具体的小问题把学习者往前推一步；用日常语言，不用术语；"
    "不超过 120 字。"
)


def load_env(env_file=None):
    """Load KEY=VALUE lines into os.environ (without overriding). Returns the file used."""
    if env_file:
        candidates = [Path(env_file).expanduser()]
    else:
        candidates = [
            ROOT / ".env",
            Path.home() / ".config" / "funal" / ".env",
            Path.home() / ".env",
        ]
    for p in candidates:
        if not p.is_file():
            continue
        for raw in p.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            if key.startswith("export "):
                key = key[len("export "):].strip()
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))
        return p
    return None


class Config:
    def __init__(self, ai_enabled):
        self.api_key = os.environ.get("KIMI_API_KEY", "").strip()
        self.base_url = os.environ.get("KIMI_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        self.model = os.environ.get("KIMI_MODEL", DEFAULT_MODEL)
        self.ai = bool(ai_enabled and self.api_key)

    def resolve_model(self):
        """Check the configured model against /models; fall back to an available one if it is gone."""
        if not self.ai:
            return None
        req = urllib.request.Request(self.base_url + "/models", headers={"Authorization": "Bearer " + self.api_key})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                ids = [m.get("id") for m in json.loads(r.read().decode("utf-8")).get("data", [])]
        except Exception as e:  # noqa: BLE001
            return "could not list models (%s); keeping %s" % (self.redact(str(e))[:120], self.model)
        if not ids or self.model in ids:
            return None
        pick = next((m for m in PREFERRED_MODELS if m in ids), ids[0])
        note = "model %s is not available to this key; using %s (available: %s)" % (self.model, pick, ", ".join(ids))
        self.model = pick
        return note

    def system_prompt(self):
        if PROMPT_FILE.is_file():
            return PROMPT_FILE.read_text(encoding="utf-8")
        return FALLBACK_PROMPT

    def redact(self, text):
        return text.replace(self.api_key, "<REDACTED>") if self.api_key else text


CONFIG = None


def origin_allowed(origin):
    if not origin or origin == "null":
        return True
    return origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):  # quieter static logs
        if self.path.startswith("/api/"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # ---- helpers ----
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        origin = self.headers.get("Origin")
        if origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin or "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---- routes ----
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/mentor/health"):
            return self._send_json(200, {"ai": CONFIG.ai, "model": CONFIG.model if CONFIG.ai else None})
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/mentor":
            return self._send_json(404, {"error": "not found"})
        if not origin_allowed(self.headers.get("Origin")):
            return self._send_json(403, {"error": "origin not allowed"})
        if not CONFIG.ai:
            return self._send_json(503, {"error": "AI mentor is not enabled on this server"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except (ValueError, json.JSONDecodeError):
            return self._send_json(400, {"error": "bad json"})

        question = str(data.get("question", "")).strip()[:MAX_QUESTION_CHARS]
        if not question:
            return self._send_json(400, {"error": "empty question"})
        context = data.get("context") or {}
        history = [
            {"role": m.get("role"), "content": str(m.get("content", ""))[:MAX_QUESTION_CHARS]}
            for m in (data.get("history") or [])
            if m.get("role") in ("user", "assistant")
        ][-MAX_HISTORY:]

        system = CONFIG.system_prompt() + "\n\n[当前屏上下文（JSON，供你参考，不要原文复述）]\n" + json.dumps(
            context, ensure_ascii=False, indent=1
        )
        messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": question}]
        payload = {"model": CONFIG.model, "messages": messages, "max_tokens": MAX_TOKENS}  # no temperature: some Kimi models only accept the default

        req = urllib.request.Request(
            CONFIG.base_url + "/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + CONFIG.api_key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                out = json.loads(resp.read().decode("utf-8"))
            choice = out["choices"][0]
            reply = (choice.get("message", {}).get("content") or "").strip()
            if not reply:
                reply = "我想得有点久，没来得及说完。你能把卡住的地方再说具体一点吗？比如：你现在觉得答案应该是多少，为什么？"
            sys.stderr.write("mentor: screen=%s finish=%s ok\n" % (context.get("screen_id"), choice.get("finish_reason")))
            return self._send_json(200, {"reply": reply})
        except urllib.error.HTTPError as e:
            detail = CONFIG.redact(e.read().decode("utf-8", "replace")[:500])
            sys.stderr.write("mentor: upstream %s %s\n" % (e.code, detail))
            return self._send_json(502, {"error": "upstream %s" % e.code, "detail": detail})
        except Exception as e:  # noqa: BLE001
            return self._send_json(502, {"error": CONFIG.redact(str(e))})


def main():
    global CONFIG
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--env-file", default=None, help="path to a KEY=VALUE file with KIMI_API_KEY")
    ap.add_argument("--no-ai", action="store_true", help="serve the tutorial without the AI mentor")
    args = ap.parse_args()

    used = load_env(args.env_file)
    CONFIG = Config(ai_enabled=not args.no_ai)
    print("FunAl tutorial: http://%s:%d/" % (args.host, args.port))
    if CONFIG.ai:
        note = CONFIG.resolve_model()
        if note:
            print("note: " + note)
        print("AI mentor: ON (model=%s, key from %s)" % (CONFIG.model, used or "environment"))
    else:
        why = "--no-ai" if args.no_ai else "no KIMI_API_KEY found (env, ./.env, ~/.config/funal/.env, ~/.env)"
        print("AI mentor: OFF (%s). The tutorial works fully without it." % why)
    try:
        ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
