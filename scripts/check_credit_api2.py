"""Check credit manager API for specific Surakarta participant transactions"""
import os, urllib.request, json, subprocess, sys

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
CREDIT_AUTH = os.environ["CREDIT_MANAGER_AUTH"]

h = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer '+SUPABASE_KEY}

# Get a participant's transaction IDs from Supabase
guid = "58dcb902-3ca2-4895-981c-1202ca556408"  # acepmridwan10@gmail.com
url = SUPABASE_URL + f"/rest/v1/credit_manager_transactions?select=id,user_id,agent,type,amount,created_at,product_name&user_id=eq.{guid}&limit=5"
req = urllib.request.Request(url, headers=h)
r = urllib.request.urlopen(req, timeout=15)
txs = json.loads(r.read())

print(f"Supabase transactions for {guid[:8]}...:")
for t in txs:
    print(f"  id={t['id']} type={t['type']:6s} amt={t['amount']} agent={t.get('agent')} product_name={t.get('product_name')} created_at={t['created_at']}")
    
    # Now check this specific transaction in the Credit Manager API
    tx_id = t['id']
    api_url = f"https://credit-manager.mwxmarket.ai/api/v1/transactions/{tx_id}"
    curl_cmd = f'curl -s "{api_url}" -H "accept: application/json" -H "Authorization: {CREDIT_AUTH}" -H "X-API-KEY: {CREDIT_AUTH}"'
    result = subprocess.run(curl_cmd, capture_output=True, text=True, shell=True, timeout=15)
    try:
        api_data = json.loads(result.stdout)
        print(f"  -> API: {json.dumps(api_data, indent=4)[:300]}")
    except:
        print(f"  -> API Error: {result.stdout[:200]}")
    print()

# Also check a non-participant (someone with agent) for comparison
print("\n\nComparing with a transaction that HAS agent in Supabase:")
url2 = SUPABASE_URL + "/rest/v1/credit_manager_transactions?select=id,user_id,agent,type,amount,created_at,product_name&agent=not.is.null&limit=3"
req2 = urllib.request.Request(url2, headers=h)
r2 = urllib.request.urlopen(req2, timeout=15)
txs2 = json.loads(r2.read())
for t in txs2:
    print(f"  id={t['id']} type={t['type']:6s} amt={t['amount']} agent={t.get('agent')} product_name={t.get('product_name')}")
    
    tx_id = t['id']
    api_url = f"https://credit-manager.mwxmarket.ai/api/v1/transactions/{tx_id}"
    curl_cmd = f'curl -s "{api_url}" -H "accept: application/json" -H "Authorization: {CREDIT_AUTH}" -H "X-API-KEY: {CREDIT_AUTH}"'
    result = subprocess.run(curl_cmd, capture_output=True, text=True, shell=True, timeout=15)
    try:
        api_data = json.loads(result.stdout)
        print(f"  -> API: {json.dumps(api_data, indent=4)[:300]}")
    except:
        print(f"  -> API Error: {result.stdout[:200]}")
    print()
