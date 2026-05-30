## Table `app_usage_logs`

Raw event logs from application usage

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `company_id` | `uuid` |  |
| `event_type` | `varchar` |  |
| `event_name` | `varchar` |  Nullable |
| `event_data` | `jsonb` |  Nullable |
| `session_id` | `varchar` |  Nullable |
| `device_type` | `varchar` |  Nullable |
| `device_os` | `varchar` |  Nullable |
| `browser` | `varchar` |  Nullable |
| `ip_address` | `varchar` |  Nullable |
| `duration_seconds` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `app_users`

Application users being monitored (Impact Plus participants)

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `external_id` | `varchar` |  Nullable Unique |
| `company_id` | `uuid` |  |
| `email` | `varchar` |  Nullable |
| `full_name` | `varchar` |  Nullable |
| `phone` | `varchar` |  Nullable |
| `employee_id` | `varchar` |  Nullable |
| `department` | `varchar` |  Nullable |
| `position` | `varchar` |  Nullable |
| `join_date` | `date` |  Nullable |
| `status` | `varchar` |  Nullable |
| `profile_data` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `customer_guid` | `text` |  Nullable |

## Table `article_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `url` | `text` |  Nullable |
| `article_id` | `int4` |  Nullable |

## Table `articles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `updated_at` | `timestamptz` |  Nullable |
| `framework` | `text` |  Nullable |
| `min_chars` | `int4` |  Nullable |
| `id` | `int4` | Primary |
| `content` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `baseline_umkm_profiles`

Denormalized snapshot of UMKM baseline survey answers per company/user

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `app_user_id` | `uuid` |  Nullable |
| `company_id` | `uuid` |  |
| `source_response_id` | `uuid` |  Nullable |
| `brand_name` | `text` |  Nullable |
| `whatsapp` | `text` |  Nullable |
| `business_type` | `text` |  Nullable |
| `years_running` | `text` |  Nullable |
| `employees` | `text` |  Nullable |
| `revenue_range` | `text` |  Nullable |
| `bookkeeping_method` | `text` |  Nullable |
| `process_score` | `int2` |  Nullable |
| `revenue_trend` | `text` |  Nullable |
| `business_score` | `int2` |  Nullable |
| `promo_platforms` | `_text` |  Nullable |
| `social_media_impact` | `text` |  Nullable |
| `content_method` | `text` |  Nullable |
| `content_frequency` | `text` |  Nullable |
| `content_difficulty` | `int2` |  Nullable |
| `social_accounts` | `text` |  Nullable |
| `ai_awareness` | `text` |  Nullable |
| `ai_perception` | `text` |  Nullable |
| `ai_usage_freq` | `text` |  Nullable |
| `ai_willingness` | `text` |  Nullable |
| `ai_budget` | `text` |  Nullable |
| `main_challenge` | `text` |  Nullable |
| `readiness_score` | `int2` |  Nullable |
| `raw` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `cms_customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `guid` | `text` | Primary |
| `username` | `text` |  Nullable |
| `full_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone_number` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `country` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `is_active` | `varchar` |  Nullable |
| `is_email_verified` | `bool` |  Nullable |
| `is_phone_number_verified` | `bool` |  Nullable |
| `referal_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `gender` | `text` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `identity_number` | `text` |  Nullable |
| `identity_img` | `text` |  Nullable |
| `country_id` | `int4` |  Nullable |
| `city_id` | `int4` |  Nullable |
| `is_identity_verified` | `bool` |  Nullable |
| `bank_name` | `text` |  Nullable |
| `bank_account_number` | `text` |  Nullable |
| `bank_owner_name` | `text` |  Nullable |
| `corporate_name` | `text` |  Nullable |
| `industry_name` | `text` |  Nullable |
| `employee_qty` | `int4` |  Nullable |
| `solution_corporate_needs` | `text` |  Nullable |
| `is_free_trial_use` | `bool` |  Nullable |
| `created_by_guid` | `text` |  Nullable |
| `created_by_name` | `text` |  Nullable |
| `updated_by_guid` | `text` |  Nullable |
| `updated_by_name` | `text` |  Nullable |
| `subscribe_list` | `jsonb` |  Nullable |

## Table `companies`

Companies participating in Impact Plus program

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `slug` | `varchar` |  Unique |
| `logo_url` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `contact_email` | `varchar` |  Nullable |
| `contact_phone` | `varchar` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `credit_manager_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `created_at` | `timestamptz` |  Nullable |
| `agent` | `uuid` |  Nullable |
| `amount` | `numeric` |  Nullable |
| `id` | `uuid` | Primary |
| `user_product_id` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `type` | `text` |  Nullable |
| `product_name` | `text` |  Nullable |
| `product_package` | `text` |  Nullable |
| `inserted_at` | `timestamptz` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `action_id` | `uuid` |  Nullable |

## Table `credit_manager_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `name` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `email` | `text` |  Nullable |

## Table `crm_activity_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pipeline_id` | `uuid` |  Nullable |
| `agent_id` | `uuid` |  Nullable |
| `action_type` | `varchar` |  |
| `description` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `crm_agents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `dashboard_user_id` | `uuid` |  Nullable |
| `full_name` | `varchar` |  |
| `email` | `varchar` |  Unique |
| `wa_number` | `varchar` |  Nullable |
| `role` | `varchar` |  |
| `is_active` | `bool` |  Nullable |
| `max_leads` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `crm_campaign_recipients`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `campaign_id` | `int8` |  |
| `customer_guid` | `text` |  Nullable |
| `phone_number` | `text` |  |
| `wa_message_id` | `text` |  Nullable |
| `send_status` | `text` |  |
| `provider_response_json` | `jsonb` |  Nullable |
| `error_message` | `text` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `failed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `crm_campaigns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `name` | `text` |  |
| `message_type` | `text` |  |
| `segment_id` | `int8` |  Nullable |
| `template_name` | `text` |  Nullable |
| `template_lang` | `text` |  Nullable |
| `template_components_json` | `jsonb` |  Nullable |
| `text_body` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `crm_lead_pipeline`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `customer_guid` | `text` |  Unique |
| `agent_id` | `uuid` |  Nullable |
| `is_monitored` | `bool` |  Nullable |
| `tier` | `varchar` |  Nullable |
| `segmen` | `varchar` |  Nullable |
| `priority` | `varchar` |  Nullable |
| `segmen_source` | `varchar` |  Nullable |
| `segmen_updated_at` | `timestamptz` |  Nullable |
| `status` | `varchar` |  Nullable |
| `last_contact_at` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `crm_segment_overrides`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pipeline_id` | `uuid` |  Nullable |
| `old_segmen` | `varchar` |  Nullable |
| `new_segmen` | `varchar` |  |
| `reason` | `text` |  Nullable |
| `overridden_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `crm_segments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `name` | `text` |  |
| `filters_json` | `jsonb` |  |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `crm_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `user_id` | `int8` |  |
| `token` | `text` |  Unique |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `crm_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `flow_type` | `text` |  |
| `template_name` | `text` |  |
| `template_text` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `crm_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `email` | `text` |  Unique |
| `password_hash` | `text` |  |
| `name` | `text` |  |
| `role` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `last_login` | `timestamptz` |  Nullable |

## Table `crm_webhook_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `provider` | `text` |  |
| `event_type` | `text` |  Nullable |
| `external_event_id` | `text` |  Nullable |
| `payload_json` | `jsonb` |  |
| `process_status` | `text` |  |
| `error_message` | `text` |  Nullable |
| `received_at` | `timestamptz` |  |
| `processed_at` | `timestamptz` |  Nullable |

## Table `csr_profile`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `description` | `text` |  Nullable |
| `period` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `company_name` | `text` |  Nullable |

## Table `dashboard_activity_logs`

Audit trail for dashboard admin actions

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `action` | `varchar` |  |
| `entity_type` | `varchar` |  Nullable |
| `entity_id` | `uuid` |  Nullable |
| `old_values` | `jsonb` |  Nullable |
| `new_values` | `jsonb` |  Nullable |
| `ip_address` | `varchar` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `dashboard_users`

Admin users who can access the dashboard with RBAC

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `varchar` |  Unique |
| `password_hash` | `varchar` |  |
| `full_name` | `varchar` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `role` | `varchar` |  |
| `company_id` | `uuid` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `email_verified` | `bool` |  Nullable |
| `last_login_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `username` | `varchar` |  Nullable Unique |

## Table `demo_excluded_emails`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `email` | `text` | Primary |
| `reason` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `event_question_answers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `registration_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `answer_value` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `event_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `event_id` | `uuid` |  Nullable |
| `section` | `varchar` |  |
| `section_order` | `int4` |  |
| `order_index` | `int4` |  |
| `question_text` | `text` |  |
| `question_type` | `varchar` |  |
| `options` | `jsonb` |  |
| `is_active` | `bool` |  |
| `is_required` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `event_registrations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `event_id` | `uuid` |  |
| `full_name` | `text` |  |
| `phone_number` | `text` |  |
| `email` | `text` |  |
| `business_name` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `registered_at` | `timestamptz` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `business_since_year` | `int4` |  Nullable |
| `team_size` | `int4` |  Nullable |
| `business_line` | `text` |  Nullable |
| `monthly_net_profit` | `text` |  Nullable |
| `has_separate_account` | `text` |  Nullable |
| `brand_assets` | `jsonb` |  Nullable |
| `profit_allocation` | `text` |  Nullable |
| `main_focus` | `text` |  Nullable |
| `subscription_consideration` | `text` |  Nullable |
| `whiz_solution_needed` | `text` |  Nullable |
| `referral_source` | `text` |  Nullable |
| `priority` | `varchar` |  Nullable |
| `priority_score` | `numeric` |  Nullable |
| `attended_at` | `timestamptz` |  Nullable |

## Table `helpdesk_auto_reply_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `name` | `text` |  |
| `trigger_type` | `text` |  |
| `trigger_config_json` | `jsonb` |  |
| `reply_type` | `text` |  |
| `reply_payload_json` | `jsonb` |  |
| `is_active` | `bool` |  |
| `priority` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `helpdesk_conversation_flows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `flow_name` | `text` |  Unique |
| `trigger_keywords` | `_text` |  |
| `steps_json` | `jsonb` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `helpdesk_conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `customer_guid` | `text` |  Nullable |
| `phone_number` | `text` |  Unique |
| `status` | `text` |  |
| `assigned_to` | `text` |  Nullable |
| `bot_enabled` | `bool` |  |
| `bot_paused_until` | `timestamptz` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `helpdesk_conversations_v2`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `provider` | `text` |  |
| `phone_number` | `text` |  |
| `customer_name` | `text` |  Nullable |
| `customer_data_json` | `jsonb` |  Nullable |
| `status` | `text` |  |
| `assigned_to` | `text` |  Nullable |
| `lead_score` | `int4` |  Nullable |
| `lead_category` | `text` |  Nullable |
| `last_intent` | `text` |  Nullable |
| `conversation_context_json` | `jsonb` |  Nullable |
| `ai_analyzed_at` | `timestamptz` |  Nullable |
| `bot_enabled` | `bool` |  |
| `bot_paused_until` | `timestamptz` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `unread_count` | `int4` |  Nullable |

## Table `helpdesk_escalation_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `condition_type` | `text` |  |
| `conditions_json` | `jsonb` |  Nullable |
| `action` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `helpdesk_intent_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `intent_name` | `text` |  |
| `keywords` | `_text` |  |
| `priority` | `int4` |  |
| `response_templates` | `_text` |  Nullable |
| `next_context` | `text` |  Nullable |
| `requires_param` | `_text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `helpdesk_lead_scores`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `conversation_id` | `int8` |  |
| `score` | `int4` |  |
| `category` | `text` |  |
| `factors_json` | `jsonb` |  Nullable |
| `calculated_at` | `timestamptz` |  |

## Table `helpdesk_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `conversation_id` | `int8` |  |
| `direction` | `text` |  |
| `sender_type` | `text` |  |
| `message_type` | `text` |  |
| `text_body` | `text` |  Nullable |
| `template_name` | `text` |  Nullable |
| `wa_message_id` | `text` |  Nullable Unique |
| `delivery_status` | `text` |  Nullable |
| `payload_json` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `helpdesk_messages_v2`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `conversation_id` | `int8` |  |
| `direction` | `text` |  |
| `sender_type` | `text` |  |
| `message_type` | `text` |  |
| `text_body` | `text` |  Nullable |
| `intent_detected` | `text` |  Nullable |
| `sentiment_detected` | `text` |  Nullable |
| `wa_message_id` | `text` |  Nullable |
| `delivery_status` | `text` |  Nullable |
| `payload_json` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `is_read` | `bool` |  Nullable |

## Table `helpdesk_personas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `text` |  Unique |
| `tone` | `text` |  |
| `greeting` | `text` |  Nullable |
| `closing` | `text` |  Nullable |
| `signature_phrases` | `_text` |  Nullable |
| `response_templates_json` | `jsonb` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `helpdesk_product_knowledge`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `text` |  |
| `content` | `text` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `helpdesk_watzap_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `api_key` | `text` |  |
| `number_key` | `text` |  |
| `webhook_url` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `helpdesk_webhook_debug`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `payload_json` | `jsonb` |  Nullable |
| `received_at` | `timestamptz` |  Nullable |

## Table `impact_periods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `is_open` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `type` | `text` |  Nullable |
| `id` | `int4` | Primary |
| `starts_at` | `timestamptz` |  Nullable |
| `name` | `text` |  Nullable |
| `ends_at` | `timestamptz` |  Nullable |

## Table `impact_responses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `submitted_at` | `timestamptz` |  Nullable |
| `email` | `text` |  Nullable |
| `id` | `int4` | Primary |
| `type` | `text` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `token` | `text` |  Nullable |
| `period_id` | `int4` |  Nullable |
| `umkm_id` | `text` |  Nullable |

## Table `lead_ai_summaries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `summary` | `text` |  Nullable |
| `id` | `int4` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `cache_key` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `lead_app_choices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `whatsapp` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `ts_raw` | `text` |  Nullable |
| `inserted_at` | `timestamptz` |  Nullable |
| `app_choice_raw` | `text` |  Nullable |
| `ts` | `timestamptz` |  Nullable |
| `id` | `int4` | Primary |
| `nama` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `app_choice` | `text` |  Nullable |

## Table `lead_app_enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `app_choice` | `text` |  Nullable |
| `lead_id` | `int4` |  Nullable |
| `lead_app_choice_id` | `int4` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `product_id` | `int4` |  Nullable |
| `id` | `int4` | Primary |
| `created_at` | `timestamptz` |  Nullable |

## Table `leads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `tanggal_daftar` | `timestamp` |  Nullable |
| `tantangan` | `text` |  Nullable |
| `nomor_whatsapp` | `text` |  Nullable |
| `cerita_usaha` | `text` |  Nullable |
| `facebook_followers` | `int4` |  Nullable |
| `tiktok_followers` | `int4` |  Nullable |
| `raw_id` | `int4` |  Nullable |
| `jumlah_tim` | `text` |  Nullable |
| `instagram_url` | `text` |  Nullable |
| `facebook_url` | `text` |  Nullable |
| `marketplace_url` | `text` |  Nullable |
| `instagram_followers` | `int4` |  Nullable |
| `credit_manager_user_id` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `inserted_at` | `timestamptz` |  Nullable |
| `tantangan_lainnya` | `text` |  Nullable |
| `nama_usaha` | `text` |  Nullable |
| `tempat_jualan` | `text` |  Nullable |
| `tiktok_url` | `text` |  Nullable |
| `nama_lengkap` | `text` |  Nullable |
| `id` | `int4` | Primary |
| `setuju_dihubungi` | `bool` |  Nullable |
| `email` | `text` |  Nullable |
| `tanggal_cutoff` | `text` |  Nullable |
| `kategori` | `text` |  Nullable |
| `kota_domisili` | `text` |  Nullable |
| `kategori_usaha` | `text` |  Nullable |

## Table `partners`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `no` | `int4` |  |
| `partner` | `text` |  |
| `tipe` | `text` |  |
| `kontak` | `text` |  Nullable |
| `pic_mw` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `next_to_do` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `progress_percentage` | `int4` |  Nullable |
| `priority` | `text` |  Nullable |
| `last_contact_date` | `date` |  Nullable |
| `expected_completion_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `created_by` | `text` |  Nullable |
| `updated_by` | `text` |  Nullable |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `guid` | `uuid` | Primary |
| `inserted_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `agent_id` | `varchar` |  Nullable |
| `package` | `text` |  Nullable |
| `id` | `int4` |  Nullable |
| `application_name` | `text` |  Nullable |
| `app_name` | `text` |  Nullable |

## Table `profile`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `customer_guid` | `text` |  |
| `full_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `phone_raw` | `text` |  Nullable |
| `phone_normalized` | `text` |  Nullable |
| `industry_name` | `text` |  Nullable |
| `model_training` | `text` |  Nullable |
| `training_name` | `text` |  Nullable |
| `classification` | `text` |  Nullable |
| `trial_username` | `text` |  Nullable |
| `trial_status` | `text` |  Nullable |
| `trial_started_at` | `date` |  Nullable |
| `trial_status_expired` | `text` |  Nullable |
| `total_debit_tx` | `numeric` |  Nullable |
| `total_credit_tx` | `numeric` |  Nullable |
| `total_debits` | `numeric` |  Nullable |
| `total_credits` | `numeric` |  Nullable |
| `latest_balance` | `numeric` |  Nullable |
| `credit_usage` | `text` |  Nullable |
| `partner` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `notes2` | `text` |  Nullable |
| `hasil_feedback` | `text` |  Nullable |
| `tanggal_input_data` | `date` |  Nullable |
| `tanggal_input_trial` | `date` |  Nullable |
| `event_id` | `uuid` |  Nullable |
| `raw_json` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `recent_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `start_time` | `timestamptz` |  Nullable |
| `name` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `type` | `text` |  Nullable |
| `id` | `int4` | Primary |
| `location` | `text` |  Nullable |
| `summary` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `referral_partners`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `partner` | `text` |  Nullable |
| `code` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `is_gov` | `bool` |  Nullable |
| `id` | `uuid` | Primary |
| `is_new` | `bool` |  Nullable |
| `activity_slug` | `text` |  Nullable |

## Table `survey_answers`

Individual answers to survey questions

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `response_id` | `uuid` |  |
| `question_id` | `uuid` |  |
| `answer_text` | `text` |  Nullable |
| `answer_value` | `jsonb` |  Nullable |
| `selected_options` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `survey_questions`

Questions belonging to each survey

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `question_text` | `text` |  |
| `question_type` | `varchar` |  |
| `options` | `jsonb` |  Nullable |
| `rating_scale` | `jsonb` |  Nullable |
| `is_required` | `bool` |  Nullable |
| `order_index` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `survey_responses`

User submissions for surveys

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `survey_id` | `uuid` |  |
| `user_id` | `uuid` |  Nullable |
| `company_id` | `uuid` |  Nullable |
| `submitted_at` | `timestamptz` |  Nullable |
| `completion_time_seconds` | `int4` |  Nullable |
| `customer_guid` | `text` |  Nullable |

## Table `survey_resumes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `customer_guid` | `text` |  Unique |
| `profile_name` | `text` |  Nullable |
| `profile_email` | `text` |  Nullable |
| `model` | `text` |  Nullable |
| `resume_text` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `surveys`

Static surveys for collecting user feedback

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `varchar` |  |
| `description` | `text` |  Nullable |
| `survey_type` | `varchar` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `tmp_training_data`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `no_hp` | `_text` |  Nullable |
| `total_credits` | `numeric` |  Nullable |
| `solusi_crmwhiz` | `text` |  Nullable |
| `klasifikasi` | `text` |  Nullable |
| `sudah_membeli_credit` | `text` |  Nullable |
| `event_id` | `uuid` |  Nullable |
| `total_credit_tx` | `numeric` |  Nullable |
| `catatan` | `text` |  Nullable |
| `tanggal_input_trial` | `date` |  Nullable |
| `tanggal_input_data` | `date` |  Nullable |
| `total_debits` | `numeric` |  Nullable |
| `no` | `int4` |  Nullable |
| `total_debit_tx` | `numeric` |  Nullable |
| `solusi_smartwhiz` | `text` |  Nullable |
| `solusi_financewhiz` | `text` |  Nullable |
| `raw_json` | `jsonb` |  Nullable |
| `id_cms` | `text` |  Nullable |
| `username_trial` | `text` |  Nullable |
| `solusi_createwhiz` | `text` |  Nullable |
| `latest_balance` | `numeric` |  Nullable |
| `guid` | `uuid` | Primary |
| `credit_usage` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `akun_aktif_expired` | `text` |  Nullable |
| `model_training` | `text` |  Nullable |
| `solusi_saleswhiz` | `text` |  Nullable |
| `solusi_smewhiz` | `text` |  Nullable |
| `nama` | `text` |  Nullable |
| `hasil_feedback` | `text` |  Nullable |
| `catatan2` | `text` |  Nullable |
| `nama_training` | `text` |  Nullable |
| `partner` | `text` |  Nullable |
| `jenis_usaha` | `text` |  Nullable |

## Table `training_enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `created_at` | `timestamptz` |  Nullable |
| `user_guid` | `uuid` |  Nullable |
| `event_id` | `uuid` |  Nullable |
| `source_guid` | `uuid` |  Nullable |
| `id` | `uuid` | Primary |

## Table `training_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `created_at` | `timestamptz` |  Nullable |
| `model` | `text` |  Nullable |
| `id_partner` | `text` |  Nullable |
| `partner` | `text` |  Nullable |
| `id` | `uuid` | Primary |
| `name` | `text` |  Nullable |
| `event_date` | `date` |  Nullable |
| `location` | `text` |  Nullable |
| `event_type` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `max_participants` | `int4` |  Nullable |
| `registration_deadline` | `date` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_by` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `transaction_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `guid` | `text` | Primary |
| `transaction_guid` | `text` |  Nullable |
| `merchant_guid` | `text` |  Nullable |
| `merchant_store_name` | `text` |  Nullable |
| `product_name` | `text` |  Nullable |
| `product_price` | `numeric` |  Nullable |
| `purchase_type_id` | `text` |  Nullable |
| `purchase_type_name` | `text` |  Nullable |
| `purchase_type_value` | `text` |  Nullable |
| `qty` | `int4` |  Nullable |
| `total_discount` | `numeric` |  Nullable |
| `grand_total` | `numeric` |  Nullable |

## Table `transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `guid` | `text` | Primary |
| `invoice_number` | `text` |  Nullable |
| `customer_guid` | `text` |  Nullable |
| `transaction_callback_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `payment_channel_id` | `text` |  Nullable |
| `payment_channel_code` | `text` |  Nullable |
| `payment_channel_name` | `text` |  Nullable |
| `payment_url` | `text` |  Nullable |
| `qty` | `int4` |  Nullable |
| `valuta_code` | `text` |  Nullable |
| `sub_total` | `numeric` |  Nullable |
| `platform_fee` | `numeric` |  Nullable |
| `payment_service_fee` | `numeric` |  Nullable |
| `total_discount` | `numeric` |  Nullable |
| `grand_total` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `created_by_guid` | `text` |  Nullable |
| `created_by_name` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `updated_by_guid` | `text` |  Nullable |
| `updated_by_name` | `text` |  Nullable |

## Table `user_sessions`

Aggregated session data for analytics

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `company_id` | `uuid` |  |
| `session_id` | `varchar` |  Unique |
| `started_at` | `timestamptz` |  |
| `ended_at` | `timestamptz` |  Nullable |
| `duration_seconds` | `int4` |  Nullable |
| `page_views` | `int4` |  Nullable |
| `device_type` | `varchar` |  Nullable |
| `device_os` | `varchar` |  Nullable |
| `browser` | `varchar` |  Nullable |
| `ip_address` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pipeline_id` | `uuid` |  Nullable |
| `agent_id` | `uuid` |  Nullable |
| `direction` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `content` | `text` |  Nullable |
| `template_id` | `uuid` |  Nullable |
| `damcorp_message_id` | `varchar` |  Nullable Unique |
| `status` | `varchar` |  Nullable |
| `status_updated_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |

## Table `wa_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  Unique |
| `display_name` | `varchar` |  |
| `segmen` | `varchar` |  Nullable |
| `content` | `text` |  |
| `variables` | `jsonb` |  Nullable |
| `damcorp_status` | `varchar` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

