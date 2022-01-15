---
title: Error Handling
---
# Error Handling

You may need to handle the following error conditions when using the API.

## GraphQL API
GraphQL error codes can be found under objects in `errors` in the `extensions.code` field.

**`GRAPHQL_PARSE_FAILED`**
> This is a client developer error. The query has a syntax error or is otherwise invalid.

**`GRAPHQL_VALIDATION_FAILED`**
> This is a client developer error. The query does not match the server's schema. This means you are trying to access a field which does not exist.

**`BAD_USER_INPUT`**
> This is likely a client developer error. You have given a field invalid input. This data may come from your user but is likely validated against a pattern, such as ISO-8601 for `Date` types, and the formatting is invalid. These patterns should not be sent directly by the user; instead, the client application should take user input to fill out the format for the field.

**`OUT_OF_SCOPE`**
> This is a client developer error. You did not request a scope for something you are trying to use, or you are using a feature you did not intend to use. The user may have permission to perform this action but the application does not.

**`PERMISSION_DENIED`**
> The user or bot does not have access to the resource it was trying to interact with. This could mean that you don't have `view` or `read` permission on a Flow when trying to access it, or that you do not have `post` when trying to post new Content.

**`null` returned where a value is expected**
> This usually means that a resource you were looking for is private or unavailable, or an error was thrown on that value.