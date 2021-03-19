import express from 'express';
import { server as graphql } from './graphql/middleware';

export = (app: express.Express) => {
    graphql.applyMiddleware({ app, path: "/graphql" });
}