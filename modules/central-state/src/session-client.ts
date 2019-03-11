import { timeStampWithRandomString } from "@phenyl/utils";

import {
  DbClient,
  PreEntity,
  Session,
  SessionClient
} from "@phenyl/interfaces";

type PhenylSessionEntityMap = {
  _PhenylSession: Session;
};

/**
 *
 */
export class PhenylSessionClient implements SessionClient {
  dbClient: DbClient<PhenylSessionEntityMap>;

  constructor(dbClient: DbClient<any>) {
    this.dbClient = dbClient;
  }

  /**
   *
   */
  async get(id: string | null): Promise<Session<string, Object> | null> {
    if (id == null) {
      return null;
    }
    try {
      const session = await this.dbClient.get({
        entityName: "_PhenylSession",
        id
      });
      if (new Date(session.expiredAt).getTime() <= Date.now()) {
        this.delete(id); // Run asynchronously
        return null;
      }
      return session;
    } catch (e) {
      // TODO: Check error message.
      return null;
    }
  }

  /**
   *
   */
  async create(
    preSession: PreEntity<Session>
  ): Promise<Session<string, Object>> {
    let value = preSession;
    if (value.id == null) {
      value = Object.assign({}, value, { id: timeStampWithRandomString() });
    }
    return this.set(value);
  }

  /**
   *
   */
  async set(value: PreEntity<Session>): Promise<Session<string, Object>> {
    return this.dbClient.insertAndGet({ entityName: "_PhenylSession", value });
  }

  /**
   *
   */
  async delete(id: string | null): Promise<boolean> {
    if (id == null) {
      return false;
    }
    await this.dbClient.delete({ entityName: "_PhenylSession", id });
    return true;
  }
}
