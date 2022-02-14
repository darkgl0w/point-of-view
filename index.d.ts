import { FastifyPluginCallback } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    view<T extends { [key: string]: any; }>(page: string, data: T): this;
    view(page: string, data?: object): this;
  }
}

export interface PointOfViewOptions {
  charset?: string;
  defaultContext?: object;
  engine: {
    'art-template'?: any;
    dot?: any;
    ejs?: any;
    eta?: any;
    handlebars?: any;
    liquid?: any;
    mustache?: any;
    nunjucks?: any;
    pug?: any;
    twig?: any;
  };
  includeViewExtension?: boolean;
  layout?: string;
  maxCache?: number;
  options?: object;
  production?: boolean;
  propertyName?: string;
  root?: string;
  templates?: string;
  viewExt?: string;
}

declare const pointOfView: FastifyPluginCallback<PointOfViewOptions>;
export { pointOfView };
export default pointOfView;
