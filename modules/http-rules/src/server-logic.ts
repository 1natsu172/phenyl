/*eslint-env node*/
import {
  GeneralCustomRequestHandler,
  EncodedHttpRequest,
  EncodedHttpResponse,
  GeneralResponseData,
  PathModifier,
  GeneralRestApiHandler,
  GeneralServerParams,
  GeneralRestApiClient
} from "@phenyl/interfaces";
import { createDirectClient, createServerError } from "@phenyl/utils";

import decodeRequest from "./decode-request";
import encodeResponse from "./encode-response";
import { isApiRequest } from "./encode-request";

/**
 *
 */
export default class ServerLogic {
  /**
   * Instance containing API logic invoked via run().
   * PhenylRestApi instance is expected.
   */
  restApiHandler: GeneralRestApiHandler;

  /**
   * (path: string) => string
   * Real server path to regular path.
   * The argument is path string, start with "/api/".
   * e.g. (path) => path.slice(5)
   */
  modifyPath: PathModifier;

  /**
   * Custom Request Handler.
   * Receive non-API HTTP request and return HTTP response.
   *  (non-API Request: request whose path doesn't start with "/api/")
   * Response can be any type, like HTML/CSS/JavaScript/Image.
   *
   * Intended Use: Web page. Don't use this function as API.
   * Example: Rich API explorer like swagger.
   *
   * The second argument "restApiClient" is a client to access directly to PhenylRestApi (bypass HTTP).
   */
  customRequestHandler: GeneralCustomRequestHandler;

  /**
   * A client for the rest api of the given restApiHandler.
   */
  restApiClient: GeneralRestApiClient;

  constructor(params: GeneralServerParams) {
    this.restApiHandler = params.restApiHandler;
    this.modifyPath = params.modifyPath || (path => path);
    this.customRequestHandler = params.customRequestHandler || notFoundHandler;
    this.restApiClient = createDirectClient(this.restApiHandler);
  }

  /**
   * Handle request to get response.
   * If modified path starts with "/api/", it will invoke GeneralRestApiHandler#handleRequestData().
   * Otherwise, it will invoke registered customRequestHandler.
   */
  async handleRequest(
    encodedHttpRequest: EncodedHttpRequest
  ): Promise<EncodedHttpResponse> {
    const modifiedPath = this.modifyPath(encodedHttpRequest.path) || ""; // Check if modified path start with "/api/"

    return isApiRequest(modifiedPath)
      ? await this.handleApiRequest(
          Object.assign(encodedHttpRequest, {
            path: modifiedPath
          })
        ) //  "path" is modifiedPath here.
      : await this.handleCustomRequest(encodedHttpRequest); //  "path" is original path here.
  }

  /**
   * @private
   * Invoke GeneralRestApiHandler#handleRequestData().
   */
  async handleApiRequest(encodedHttpRequest: EncodedHttpRequest) {
    let responseData: GeneralResponseData;

    try {
      // 1. Decoding Request
      const requestData = decodeRequest(encodedHttpRequest);

      // 2. Invoking PhenylRestApi
      responseData = await this.restApiHandler.handleRequestData(requestData);
    } catch (err) {
      responseData = {
        type: "error",
        payload: createServerError(err)
      };
    }

    // 3. Encoding Response
    return encodeResponse(responseData);
  }

  /**
   * @private
   * Run custom request registered.
   * Note that encodedHttpRequest.path is originalPath ( not equal to the modified path by this.modifyPath()).
   */
  async handleCustomRequest(encodedHttpRequest: EncodedHttpRequest) {
    try {
      const customResponse = await this.customRequestHandler(
        encodedHttpRequest,
        this.restApiClient
      );
      return customResponse;
    } catch (err) {
      // TODO: Show error in development environment.
      const body = "Internal Server Error.";
      return createPlainTextResponse(body, 500);
    }
  }
}

/**
 * @private
 * Default value of ServerLogic#handleCustomRequest().
 * Return 404 response.
 */
async function notFoundHandler(
  encodedHttpRequest: EncodedHttpRequest
): Promise<EncodedHttpResponse> {
  const { path } = encodedHttpRequest;
  const body = `Not Found.\nThe requested URL "${path}" is not found on this server.`;
  return createPlainTextResponse(body, 404);
}

/**
 * @private
 * Create plain text response from the body.
 */
function createPlainTextResponse(
  body: string,
  statusCode: number
): EncodedHttpResponse {
  return {
    body,
    statusCode,
    headers: {
      "content-length": Buffer.byteLength(body).toString(),
      "content-type": "text/plain"
    }
  };
}
