# ARES Plugins Registry

Modular plugin structure allowing runtime extension of threat inputs, webhook notification forwarders, and log decoders.

## Directory layout
- `ingestion/`: Log stream formats (Syslog, CloudTrail, AuthLog)
- `dispatch/`: Alert sinks (Slack, Discord, Custom Webhooks, Email)
