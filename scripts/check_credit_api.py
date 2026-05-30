import os, urllib.request, json, sys

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CREDIT_API = "https://credit-manager.mwxmarket.ai/api/v1/transactions"
CREDIT_AUTH = os.environ["CREDIT_MANAGER_AUTH"]

# Step 1: Get 5 participant guids from Supabase
h_supabase = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer '+SUPABASE_KEY}
emails = "acepmridwan10@gmail.com,zie.zaenal@gmail.com,aliadesign79@gmail.com,annisaisfahanie@gmail.com,annisapwh54@gmail.com"
url = SUPABASE_URL + '/rest/v1/cms_customers?select=guid,email&email=in.(' + emails + ')'
print("Fetching from Supabase:", url[:80])
req = urllib.request.Request(url, headers=h_supabase)
r = urllib.request.urlopen(req, timeout=15)
customers = json.loads(r.read())
print(f"Found {len(customers)} customers:")
for c in customers:
    print(f"  {c['email']:35s} -> {c['guid']}")
    guid = c['guid']

    # Step 2: Check credit API for this user via curl
    import subprocess as sp
    api_url = CREDIT_API + f"?page=1&limit=10&start_date=2026-05-20&end_date=2026-05-22"
    curl_cmd = f'curl -s "{api_url}" -H "accept: application/json" -H "Authorization: {CREDIT_AUTH}" -H "X-API-KEY: {CREDIT_AUTH}"'
    result = sp.run(curl_cmd, capture_output=True, text=True, shell=True, timeout=15)
    api_data = json.loads(result.stdout)
    txs = api_data.get('data', [])
    user_txs = [t for t in txs if t['user_id'] == guid]
    print(f"     Credit API: {len(user_txs)} tx for this user (out of {len(txs)} total)")
    for t in user_txs[:5]:
        print(f"       type={t['type']:6s} amt={str(t['amount']):4s} agent_id={str(t.get('agent_id','N/A'))}")
    if not user_txs:
        print(f"     (no transactions found for {guid[:8]}...)")

print("\nDone!")
