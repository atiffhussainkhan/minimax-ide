#!/usr/bin/env python3
"""Create the GitHub repository using the credential git already has stored.

The token is read from the OS keychain via `git credential fill` and is never
printed, logged, or written anywhere. It is used for exactly one request: the
POST that creates the repository.

    python3 tools/create_repo.py <owner> <name> "<description>"
"""
import subprocess, sys, json, urllib.request, urllib.error

def stored_credential(host):
    """Ask git's credential helper for the token it already has. Never echoed."""
    p = subprocess.run(["git", "credential", "fill"],
                       input=f"protocol=https\nhost={host}\n\n",
                       capture_output=True, text=True)
    for line in p.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    return None

def main():
    owner, name = sys.argv[1], sys.argv[2]
    desc = sys.argv[3] if len(sys.argv) > 3 else ""
    host = "github.com"
    token = stored_credential(host)
    if not token:
        print("  no stored credential for github.com — nothing done", file=sys.stderr)
        return 2

    body = json.dumps({
        "name": name, "description": desc, "private": False,
        "auto_init": False, "has_issues": True, "has_wiki": False,
    }).encode()
    req = urllib.request.Request(f"https://api.github.com/user/repos", data=body, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "santas-visit-setup")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            info = json.load(r)
            print(f"  created  {info['full_name']}  ({info['html_url']})")
            print(f"  visibility: {'private' if info['private'] else 'public'}")
            return 0
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:200]
        # Never echo the Authorization header back.
        print(f"  HTTP {e.code}: {detail}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
