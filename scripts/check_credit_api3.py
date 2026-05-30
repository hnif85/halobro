"""Simple check of specific transactions in Credit Manager API"""
import os, subprocess, json

CREDIT_AUTH = os.environ["CREDIT_MANAGER_AUTH"]

# Surakarta participant transaction (agent=null in Supabase)
tx_ids = [
    "6fc665cb-7956-4fd2-bc0a-a22c398f93c5",  # credit
    "7fb1d1d4-eff0-428e-86fa-84f222a0863d",  # debit
    "ae4d05d6-0cb1-4611-b1f7-6767536ed584",  # debit
]

print("=== SURAKARTA PARTICIPANT TRANSACTIONS ===")
for tx_id in tx_ids:
    api_url = f"https://credit-manager.mwxmarket.ai/api/v1/transactions/{tx_id}"
    curl_cmd = f'curl -s "{api_url}" -H "accept: application/json" -H "Authorization: {CREDIT_AUTH}" -H "X-API-KEY: {CREDIT_AUTH}"'
    result = subprocess.run(curl_cmd, capture_output=True, text=True, shell=True, timeout=15)
    data = json.loads(result.stdout).get('data', {})
    print(f"\nTransaction: {tx_id[:8]}")
    print(f"  user_id:       {data.get('user_id','N/A')[:8]}")
    print(f"  type:          {data.get('type','N/A')}")
    print(f"  amount:        {data.get('amount','N/A')}")
    print(f"  agent_id:      {data.get('agent_id','N/A')}")
    print(f"  product_name:  {data.get('product_name','N/A')}")
    print(f"  user_product_id: {data.get('user_product_id','N/A')}")
    print(f"  action_id:     {data.get('action_id','N/A')}")
    print(f"  reason:        {data.get('reason','N/A')}")

# Now check transactions that DO have agent in Supabase
tx_ids2 = [
    "24f6e566-fe08-49b8-a835-47d1245d2f0c",
    "a9ddf707-dd08-49a1-8494-7c2fdafd9a12",
]

print("\n\n=== TRANSACTIONS WITH AGENT IN SUPABASE ===")
for tx_id in tx_ids2:
    api_url = f"https://credit-manager.mwxmarket.ai/api/v1/transactions/{tx_id}"
    curl_cmd = f'curl -s "{api_url}" -H "accept: application/json" -H "Authorization: {CREDIT_AUTH}" -H "X-API-KEY: {CREDIT_AUTH}"'
    result = subprocess.run(curl_cmd, capture_output=True, text=True, shell=True, timeout=15)
    data = json.loads(result.stdout).get('data', {})
    print(f"\nTransaction: {tx_id[:8]}")
    print(f"  user_id:       {data.get('user_id','N/A')[:8]}")
    print(f"  type:          {data.get('type','N/A')}")
    print(f"  amount:        {data.get('amount','N/A')}")
    print(f"  agent_id:      {data.get('agent_id','N/A')}")
    print(f"  product_name:  {data.get('product_name','N/A')}")
    print(f"  user_product_id: {data.get('user_product_id','N/A')}")
    print(f"  action_id:     {data.get('action_id','N/A')}")
    print(f"  reason:        {data.get('reason','N/A')}")
