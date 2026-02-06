export interface RouteConfig {
  basePath?: string;
  params?: Record<string, string>;
}

export function buildRoute(path: string, config?: RouteConfig): string {
  let route = path;

  if (config?.params) {
    for (const [key, value] of Object.entries(config.params)) {
      route = route.replace(`:${key}`, encodeURIComponent(value));
      route = route.replace(`[${key}]`, encodeURIComponent(value));
    }
  }

  if (config?.basePath) {
    route = `${config.basePath.replace(/\/$/, '')}${route}`;
  }

  return route;
}

export function getRouteParams(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      params[patternPart.slice(1, -1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}
