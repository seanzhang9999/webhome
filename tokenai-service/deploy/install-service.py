#!/usr/bin/env python3
"""Install a reviewed release and dedicated systemd identity. Run with sudo."""
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import json
import os
import pwd
import shutil
import subprocess

if os.geteuid() != 0:
    raise SystemExit('Run this deployment entrypoint with sudo')

source = Path(__file__).resolve().parents[1]
workspace = source.parent
base = Path('/opt/tokenai-agent')
release = base / 'releases' / datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y%m%d-%H%M%S')
try:
    account = pwd.getpwnam('tokenai')
except KeyError:
    subprocess.run(['useradd', '--system', '--home-dir', '/var/lib/tokenai-agent', '--shell', '/usr/sbin/nologin', 'tokenai'], check=True)
    account = pwd.getpwnam('tokenai')

release.mkdir(parents=True, mode=0o755)
target = release / 'tokenai-service'
target.mkdir(mode=0o755)
for name in ['src', 'public', 'node_modules']:
    shutil.copytree(source / name, target / name, symlinks=True)
for name in ['package.json', 'package-lock.json']:
    shutil.copy2(source / name, target / name)
shutil.copy2(workspace / 'tokenai-expense.js', release / 'tokenai-expense.js')
# Source checkouts can have private directory modes. Releases contain code only;
# the dedicated service identity needs read/traverse access, never write access.
for root, dirs, files in os.walk(release):
    os.chmod(root, 0o755)
    for name in files:
        path = Path(root) / name
        if not path.is_symlink():
            os.chmod(path, 0o755 if path.stat().st_mode & 0o111 else 0o644)
node_bin = base / 'node/bin'
node_bin.mkdir(parents=True, exist_ok=True)
node_staged = node_bin / 'node.next'
shutil.copy2(Path('/home/ecs-user/.local/bin/node').resolve(), node_staged)
os.chmod(node_staged, 0o755)
os.replace(node_staged, node_bin / 'node')
os.chmod(base, 0o755)
os.chmod(base / 'releases', 0o755)
os.chmod(base / 'node', 0o755)
os.chmod(node_bin, 0o755)
os.chmod(node_bin / 'node', 0o755)

credentials = Path('/home/ecs-user/.config/tokenai-agent/environment')
config_dir = Path('/etc/tokenai-agent')
config_dir.mkdir(exist_ok=True, mode=0o750)
os.chown(config_dir, 0, account.pw_gid)
target_env = config_dir / 'environment'
if target_env.exists():
    backup = config_dir / ('environment.bak-' + release.name)
    shutil.copy2(target_env, backup)
    os.chmod(backup, 0o600)
    os.chown(backup, 0, 0)
shutil.copy2(credentials, target_env)
os.chmod(target_env, 0o600)
os.chown(target_env, account.pw_uid, account.pw_gid)

data = Path('/var/lib/tokenai-agent')
data.mkdir(exist_ok=True, mode=0o700)
initial = Path('/home/ecs-user/.local/state/tokenai-agent/tokenai.sqlite')
if not (data / 'tokenai.sqlite').exists() and initial.exists():
    # Use SQLite's backup API; never copy a possibly live WAL database directly.
    import sqlite3
    with sqlite3.connect(initial) as src, sqlite3.connect(data / 'tokenai.sqlite') as dst:
        src.backup(dst)
for root, dirs, files in os.walk(data):
    os.chown(root, account.pw_uid, account.pw_gid)
    os.chmod(root, 0o700)
    for name in files:
        p = Path(root) / name
        os.chown(p, account.pw_uid, account.pw_gid)
        os.chmod(p, 0o600)

current = base / 'current'
previous = str(current.resolve()) if current.exists() else None
link = base / 'current.next'
link.symlink_to(target)
os.replace(link, current)
shutil.copy2(source / 'deploy/tokenai-agent.service', '/etc/systemd/system/tokenai-agent.service')
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'tokenai-agent.service'], check=True)
if previous:
    subprocess.run(['systemctl', 'restart', 'tokenai-agent.service'], check=True)
print(json.dumps({'release': str(target), 'previous': previous, 'service': 'tokenai-agent.service'}))
