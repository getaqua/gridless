---
title: What Needs Changing?
---
# What Needs Changing?

For various taxonomies, adding new fields will require adding them in several places. Improvements on the following features may require modifications in these places.

If you're looking for details on various taxonomies, such as what Flows are, perhaps [the Taxonomy page]({{site.base_url}}/docs/taxonomy.md) is worth a look.

## Flows
To change the fields on Flows, you may need to change the fields in the following places:
* The TypeScript interface in `src/db/models/flowModel.ts`
* The MongoDB Schema object in `src/db/models/flowModel.ts`
* **If the MongoDB field is not the same as the GraphQL field,** the GraphQL resolver in `src/flows/resolver.ts`
* The GraphQL schema in `src/graphql/schemas/flow.graphql`

## Content
To change the fields on Content, you may need to change the fields in the following places:
* The TypeScript interface in `src/db/models/contentModel.ts`
* The MongoDB Schema object in `src/db/models/contentModel.ts`
* **If the MongoDB field is not the same as the GraphQL field,** the GraphQL resolver in `src/content/resolver.ts`
* The GraphQL schema in `src/graphql/schemas/content.graphql`

## Scopes
To add or remove a scope, used for apps, you will need to change the following:
* The scope's user-facing appearance in `src/auth/scopeStrings.json`
* The `Scopes` enumeration in `src/auth/UserModel.ts`