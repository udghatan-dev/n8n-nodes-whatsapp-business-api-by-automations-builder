import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IDataObject,
  IExecuteFunctions,
  IHookFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  IWebhookFunctions,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export type WhatsAppRequestContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret?: string;
  verifyToken?: string;
  apiVersion?: string;
}

export async function whatsAppApiRequest(
  this: WhatsAppRequestContext,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<IDataObject> {
  const credentials = (await this.getCredentials('whatsAppBusinessApi')) as unknown as WhatsAppCredentials | undefined;

  const apiVersion = credentials?.apiVersion?.trim() || 'v21.0';
  const baseUrl = `https://crmapi.1automations.com/api/meta/${apiVersion}`;

  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${endpoint}`,
    qs,
    body,
    json: true,
  };

  if (method === 'GET' || Object.keys(body).length === 0) {
    delete options.body;
  }
  if (Object.keys(qs).length === 0) {
    delete options.qs;
  }

  try {
    return (await this.helpers.httpRequestWithAuthentication.call(this, 'whatsAppBusinessApi', options)) as IDataObject;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

export async function sendMessage(this: IExecuteFunctions, payload: IDataObject): Promise<IDataObject> {
  const credentials = (await this.getCredentials('whatsAppBusinessApi')) as unknown as WhatsAppCredentials | undefined;

  if (!credentials?.phoneNumberId) {
    throw new NodeApiError(this.getNode(), {
      message: 'Phone Number ID is missing from credentials.',
    } as JsonObject);
  }

  return whatsAppApiRequest.call(this, 'POST', `/${credentials.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    ...payload,
  });
}

export function verifyMetaSignature(appSecret: string, rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice('sha256='.length) : signatureHeader;
  const expected = createHmac('sha256', appSecret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody)
    .digest('hex');
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cleanUndefined<T extends IDataObject>(input: T): T {
  for (const key of Object.keys(input)) {
    const value = (input as IDataObject)[key];
    if (value === undefined || value === null || value === '') {
      delete (input as IDataObject)[key];
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      cleanUndefined(value as IDataObject);
      if (Object.keys(value as IDataObject).length === 0) {
        delete (input as IDataObject)[key];
      }
    }
  }
  return input;
}

export async function fetchMessageTemplates(this: WhatsAppRequestContext): Promise<IDataObject[]> {
  const credentials = (await this.getCredentials('whatsAppBusinessApi')) as unknown as
    | WhatsAppCredentials
    | undefined;
  const wabaId = credentials?.businessAccountId?.trim();
  if (!wabaId) {
    throw new NodeApiError(this.getNode(), {
      message: 'WABA ID is missing from credentials. Set it on the WhatsApp Business credential.',
    } as JsonObject);
  }
  const response = await whatsAppApiRequest.call(
    this,
    'GET',
    `/${wabaId}/message_templates`,
    {},
    { json: 'true' },
  );
  const list = (response as IDataObject).data ?? response;
  return Array.isArray(list) ? (list as IDataObject[]) : [];
}

export function buildTemplateExampleMap(template: IDataObject): Record<string, string> {
  const examples: Record<string, string> = {};
  const components = (template.components as IDataObject[]) ?? [];
  for (const component of components) {
    const type = String(component.type ?? '').toLowerCase();
    const example = component.example as IDataObject | undefined;
    if (!example) continue;

    if (type === 'header') {
      const format = String(component.format ?? '').toLowerCase();
      const handle = example.header_handle as string[] | undefined;
      if (format && handle?.length) {
        examples[`header#${format}`] = handle[0];
      }
      const headerText = example.header_text as string[] | undefined;
      if (headerText?.length) {
        examples['header#text'] = headerText[0];
      }
    }

    if (type === 'body') {
      const bodyText = example.body_text as string[][] | undefined;
      const row = bodyText?.[0] ?? [];
      row.forEach((value, idx) => {
        examples[`body#${idx + 1}`] = String(value);
      });
    }
  }
  return examples;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

export function substitutePlaceholders<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
      const trimmed = key.trim();
      return Object.prototype.hasOwnProperty.call(vars, trimmed) ? vars[trimmed] : match;
    }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => substitutePlaceholders(entry, vars)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: IDataObject = {};
    for (const [k, v] of Object.entries(value as IDataObject)) {
      out[k] = substitutePlaceholders(v, vars) as IDataObject[string];
    }
    return out as unknown as T;
  }
  return value;
}
