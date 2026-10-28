#!/usr/bin/env python3
"""Certbot DNS hook using the host's existing Aliyun CLI authentication."""
import json
import os
import re
import subprocess
import sys
import time

def aliyun(action, *args):
    result = subprocess.run(['aliyun', 'alidns', action, *args], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

if os.environ.get('CERTBOT_DOMAIN') != 'tokenai.awiki.ai':
    raise SystemExit('Unexpected ACME domain')

if sys.argv[1] == 'auth':
    token = os.environ['CERTBOT_VALIDATION']
    result = aliyun('AddDomainRecord', '--DomainName', 'awiki.ai', '--RR', '_acme-challenge.tokenai', '--Type', 'TXT', '--Value', token, '--TTL', '600')
    record_id = result['RecordId']
    ready = False
    for _ in range(30):
        query = subprocess.run(['dig', '+short', 'TXT', '_acme-challenge.tokenai.awiki.ai', '@ns1.alidns.com'], capture_output=True, text=True)
        if token in query.stdout:
            ready = True
            break
        time.sleep(2)
    if not ready:
        aliyun('DeleteDomainRecord', '--RecordId', record_id)
        raise SystemExit('ACME TXT propagation timed out')
    print(record_id)
elif sys.argv[1] == 'cleanup':
    record_id = os.environ.get('CERTBOT_AUTH_OUTPUT', '').strip()
    if not re.fullmatch(r'\d+', record_id):
        raise SystemExit('Invalid ACME record ID')
    record = aliyun('DescribeDomainRecordInfo', '--RecordId', record_id)
    if record['DomainName'] != 'awiki.ai' or record['RR'] != '_acme-challenge.tokenai' or record['Type'] != 'TXT':
        raise SystemExit('Refusing to remove unrelated DNS record')
    aliyun('DeleteDomainRecord', '--RecordId', record_id)
else:
    raise SystemExit('Expected auth or cleanup')
