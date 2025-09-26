import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getJwt } from "./auth";

export function newLiveConnection(opts = {}) {
  const baseUrl = "https://localhost:7221/hubs/livequiz";
  const conn = new HubConnectionBuilder()
    .withUrl(baseUrl, {
      accessTokenFactory: () => getJwt(),
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .configureLogging(opts.logging ?? LogLevel.None) // <= add this
    .build();

  return conn;
}
