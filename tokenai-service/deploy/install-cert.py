#!/usr/bin/env python3
"""Install only the tokenai.awiki.ai certificate, then validate/reload Nginx."""
from pathlib import Path
import os
import shutil
import subprocess

if os.geteuid() != 0:
    raise SystemExit('Run as root')
source = Path('/home/ecs-user/.config/tokenai-agent/acme/live/tokenai.awiki.ai')
subprocess.run(['openssl', 'x509', '-in', str(source / 'fullchain.pem'), '-noout', '-checkhost', 'tokenai.awiki.ai', '-checkend', '86400'], check=True, capture_output=True)
certificate_key = subprocess.run(['openssl', 'x509', '-in', str(source / 'fullchain.pem'), '-pubkey', '-noout'], check=True, capture_output=True).stdout
private_key_public = subprocess.run(['openssl', 'pkey', '-in', str(source / 'privkey.pem'), '-pubout'], check=True, capture_output=True).stdout
if certificate_key != private_key_public:
    raise SystemExit('Certificate/key mismatch')
target = Path('/etc/nginx/ssl/tokenai.awiki.ai')
target.mkdir(mode=0o700, parents=True, exist_ok=True)
for name, mode in [('fullchain.pem', 0o644), ('privkey.pem', 0o600)]:
    staged = target / (name + '.next')
    shutil.copyfile(source / name, staged)
    staged.chmod(mode)
    os.replace(staged, target / name)
subprocess.run(['/usr/sbin/nginx', '-t'], check=True)
subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
print('TokenAI certificate installed and Nginx reloaded')
