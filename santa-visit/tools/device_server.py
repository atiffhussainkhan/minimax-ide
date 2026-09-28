#!/usr/bin/env python3
"""Serve santa-visit and collect the phone's export-test result.

    python3 tools/device_server.py 8099

Open the printed URL on the phone. The test page POSTs its verdict to /report,
which lands in /tmp/santa_device_report.json. Nothing about the phone's photo
or any user data is collected — only the test verdict and the browser's user
agent string.
"""
import http.server, socketserver, json, os, sys, socket, datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = "/tmp/santa_device_report.json"


def lan_ip():
    """The address the phone on the same Wi-Fi will use."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))          # no packets sent, just picks a route
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        if self.path.startswith("/report"):
            try:
                body = open(REPORT, "rb").read()
            except OSError:
                body = b"{}"
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        super().do_GET()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode("utf-8", "replace")
        try:
            obj = json.loads(raw)
        except Exception:
            obj = {"raw": raw[:400]}
        obj["received_at"] = datetime.datetime.now().isoformat(timespec="seconds")
        obj["client_ip"] = self.client_address[0]
        with open(REPORT, "w") as f:
            json.dump(obj, f, indent=2)
        print("\n=== RESULT RECEIVED ===")
        print(json.dumps(obj, indent=2))
        print("=" * 28 + "\n", flush=True)
        self.send_response(200); self._cors()
        self.send_header("Content-Length", "2"); self.end_headers()
        self.wfile.write(b"ok")


class Srv(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    ip = lan_ip()
    with Srv(("0.0.0.0", PORT), H) as httpd:
        print(f"phone   : http://{ip}:{PORT}/santa-visit/mobile_test.html")
        print(f"laptop  : http://localhost:{PORT}/santa-visit/mobile_test.html")
        print(f"result  : {REPORT}")
        print("waiting for the phone... (ctrl-c to stop)", flush=True)
        httpd.serve_forever()
