import {
  PhenylEntityClient,
  PhenylEntityClientOptions
} from "@phenyl/central-state";

import { GeneralEntityMap } from "@phenyl/interfaces";
import { MongoDbConnection } from "./connection";
import { PhenylMongoDbClient } from "./mongodb-client";

export function createEntityClient<M extends GeneralEntityMap>(
  conn: MongoDbConnection,
  options: PhenylEntityClientOptions<M> = {}
): PhenylMongoDbEntityClient<M> {
  return new PhenylMongoDbEntityClient(conn, options);
}

export class PhenylMongoDbEntityClient<
  M extends GeneralEntityMap
> extends PhenylEntityClient<M> {
  constructor(
    conn: MongoDbConnection,
    options: PhenylEntityClientOptions<M> = {}
  ) {
    const dbClient = new PhenylMongoDbClient<M>(conn);
    super(dbClient, options);
  }
}
