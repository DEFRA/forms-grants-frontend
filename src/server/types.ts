import yar from "@hapi/yar";
import { Request, ResponseToolkit, Server, ResponseObject } from "@hapi/hapi";
import { Logger } from "pino";

import { RateOptions } from "./plugins/rateLimit";
import {
  CacheService,
  EmailService,
  NotifyService,
  PayService,
  UploadService,
  WebhookService,
} from "./services";

type Services = (
  services: string[]
) => {
  cacheService: CacheService;
  emailService: EmailService;
  notifyService: NotifyService;
  payService: PayService;
  uploadService: UploadService;
  webhookService: WebhookService;
};

export type RouteConfig = {
  rateOptions?: RateOptions;
  formFileName?: string;
  formFilePath?: string;
  enforceCsrf?: boolean;
};

declare module "@hapi/hapi" {
  // Here we are decorating Hapi interface types with
  // props from plugins which doesn't export @types
  interface Request {
    services: Services; // plugin schmervice
    i18n: {
      // plugin locale
      setLocale(lang: string): void;
      getLocale(request: Request): void;
      getDefaultLocale(): string;
      getLocales(): string[];
    };
    logger: Logger;
    yar: yar.Yar;
  }

  interface Response {}

  interface Server {
    logger: Logger;
    services: Services; // plugin schmervice
    registerService: (services: any[]) => void; // plugin schmervice
    yar: yar.ServerYar;
  }

  interface ResponseToolkit {
    view: (viewName: string, data?: { [prop: string]: any }) => any; // plugin view
  }
}

export type HapiRequest = Request;
export type HapiResponseToolkit = ResponseToolkit;
export type HapiServer = Server;
export type HapiResponseObject = ResponseObject;
