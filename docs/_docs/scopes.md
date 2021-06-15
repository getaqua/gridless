---
title: Scopes
---
# Scopes

| Scope | Display Name | Required for endpoints |
|-------|--------------|------------------------|
| `user.read` | Use your email address and phone number | None yet |
| `flow.new` | Create Flows on your behalf | `createFlow` |
| `flow.list` | Discover your public and private Flows | None yet |
| `flow.join` | Join Flows for you | `joinFlow` |
| `flow.view.private` | View your private Flows it already knows about | `getFlow` on private Flows |
| `flow.read.public` | Read and respond to Content in public Flows as you | `getFlow.content` on public Flows |
| `flow.read.private` | Read and respond to Content in private Flows as you | `getFlow.content` on private Flows |
| `user.addbot` | Link bots to your account | None yet |
| `flow.content.post` | Post Content to your Flows | `postContent` |
| `flow.content.manage` | Pin, edit, and delete Content in your Flows | `deleteContent` |
| `flow.update` | Change settings in your Flows | `updateFlow` |
| `flow.delete` | Delete your Flows | `deleteFlow` |
| `user.impersonate` | Post as you to your Profile and Flows | None yet |