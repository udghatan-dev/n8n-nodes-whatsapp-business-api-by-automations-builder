import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { buildTemplateExampleMap, cleanUndefined, fetchMessageTemplates, sendMessage, substitutePlaceholders } from './GenericFunctions';
import { sessionMessageFields, sessionMessageOperations } from './descriptions/SessionMessageDescription';
import { templateMessageFields } from './descriptions/TemplateMessageDescription';

type Operation = 'sendText' | 'sendMedia' | 'sendLocation' | 'sendContacts' | 'sendInteractive' | 'sendReaction' | 'sendTemplate';

function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '').replace(/^\+/, '');
}

function withContext(payload: IDataObject, replyTo?: string): IDataObject {
  if (replyTo) {
    payload.context = { message_id: replyTo };
  }
  return payload;
}

export class WhatsAppBusinessByAutomationsBuilder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'WhatsApp Business API by Automations Builder',
    name: 'whatsAppBusinessByAutomationsBuilder',
    icon: 'file:whatsapp.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Send WhatsApp Business API session and template messages',
    defaults: { name: 'WhatsApp Business API by Automations Builder' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'whatsAppBusinessApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'hidden',
        noDataExpression: true,
        default: 'message',
      },
      ...sessionMessageOperations,
      ...sessionMessageFields,
      ...templateMessageFields,
    ],
  };

  methods = {
    loadOptions: {
      async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const templates = await fetchMessageTemplates.call(this);
        return templates
          .map((t) => {
            const name = String(t.name ?? '');
            const language = String(t.language ?? '');
            const status = String(t.status ?? '');
            const id = String(t.id ?? name);
            return {
              name: `${name} (${language}, ${status})`,
              value: id,
              description: (t.category as string) || undefined,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
      },
    },
    resourceMapping: {
      async getTemplateVariables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
        const templateId = this.getNodeParameter('templateName', '') as string;
        if (!templateId) return { fields: [] };

        const templates = await fetchMessageTemplates.call(this);
        const template = templates.find((t) => String(t.id) === templateId || String(t.name) === templateId);
        if (!template) return { fields: [] };

        const variables = (template.variables as string[] | undefined) ?? [];
        const examples = buildTemplateExampleMap(template);
        return {
          fields: variables.map((variable) => ({
            id: variable,
            displayName: variable,
            defaultMatch: false,
            canBeUsedToMatch: false,
            required: true,
            display: true,
            type: 'string' as const,
            defaultValue: examples[variable] ?? null,
          })),
        };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const templateCache = new Map<string, IDataObject>();

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as Operation;
        const rawTo = this.getNodeParameter('to', i, '') as string;
        const to = normalizePhone(rawTo);
        if (!to) {
          throw new NodeOperationError(this.getNode(), 'Recipient phone number is required.', {
            itemIndex: i,
          });
        }

        const replyTo = (this.getNodeParameter('replyTo', i, '') as string) || undefined;

        let payload: IDataObject = { recipient_type: 'individual', to };

        switch (operation) {
          case 'sendText': {
            const text = this.getNodeParameter('text', i) as string;
            const previewUrl = this.getNodeParameter('previewUrl', i, true) as boolean;
            payload = withContext(
              {
                ...payload,
                type: 'text',
                text: { body: text, preview_url: previewUrl },
              },
              replyTo,
            );
            break;
          }

          case 'sendMedia': {
            const mediaType = this.getNodeParameter('mediaType', i) as 'image' | 'video' | 'audio' | 'document' | 'sticker';
            const source = this.getNodeParameter('mediaSource', i) as 'url' | 'id';
            const caption =
              mediaType === 'image' || mediaType === 'video' || mediaType === 'document'
                ? (this.getNodeParameter('caption', i, '') as string) || undefined
                : undefined;
            const filename = mediaType === 'document' ? (this.getNodeParameter('filename', i, '') as string) || undefined : undefined;

            const media: IDataObject = {};
            if (source === 'url') {
              media.link = this.getNodeParameter('mediaUrl', i) as string;
            } else {
              media.id = this.getNodeParameter('mediaId', i) as string;
            }
            if (caption) media.caption = caption;
            if (filename) media.filename = filename;

            payload = withContext(
              {
                ...payload,
                type: mediaType,
                [mediaType]: media,
              },
              replyTo,
            );
            break;
          }

          case 'sendLocation': {
            const location = cleanUndefined({
              latitude: this.getNodeParameter('latitude', i) as number,
              longitude: this.getNodeParameter('longitude', i) as number,
              name: (this.getNodeParameter('locationName', i, '') as string) || undefined,
              address: (this.getNodeParameter('address', i, '') as string) || undefined,
            });
            payload = withContext({ ...payload, type: 'location', location }, replyTo);
            break;
          }

          case 'sendContacts': {
            const contactsCol = this.getNodeParameter('contacts', i, {}) as {
              contact?: ContactInput[];
            };
            const contacts = (contactsCol.contact ?? []).map(buildContactPayload);
            if (contacts.length === 0) {
              throw new NodeOperationError(this.getNode(), 'Add at least one contact.', {
                itemIndex: i,
              });
            }
            payload = withContext({ ...payload, type: 'contacts', contacts }, replyTo);
            break;
          }

          case 'sendInteractive': {
            const interactiveType = this.getNodeParameter('interactiveType', i) as 'button' | 'list';
            const body = this.getNodeParameter('interactiveBody', i) as string;
            const headerType = this.getNodeParameter('headerType', i, 'none') as 'none' | 'text' | 'image' | 'video' | 'document';
            const footerText = this.getNodeParameter('interactiveFooter', i, '') as string;

            const interactive: IDataObject = {
              type: interactiveType,
              body: { text: body },
            };

            if (headerType === 'text') {
              const headerText = this.getNodeParameter('interactiveHeaderText', i, '') as string;
              if (headerText) interactive.header = { type: 'text', text: headerText };
            } else if (headerType === 'image' || headerType === 'video' || headerType === 'document') {
              const link = this.getNodeParameter('interactiveHeaderMediaUrl', i, '') as string;
              if (!link) {
                throw new NodeOperationError(this.getNode(), `Header media URL is required for ${headerType} headers.`, { itemIndex: i });
              }
              const media: IDataObject = { link };
              if (headerType === 'document') {
                const filename = this.getNodeParameter('interactiveHeaderFilename', i, '') as string;
                if (filename) media.filename = filename;
              }
              interactive.header = { type: headerType, [headerType]: media };
            }

            if (footerText) interactive.footer = { text: footerText };

            if (interactiveType === 'button') {
              const buttonsCol = this.getNodeParameter('buttons', i, {}) as {
                button?: Array<{ id: string; title: string }>;
              };
              const buttons = (buttonsCol.button ?? []).map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title },
              }));
              interactive.action = { buttons };
            } else {
              const sectionsCol = this.getNodeParameter('sections', i, {}) as {
                section?: Array<{
                  title?: string;
                  rows?: { row?: Array<{ id: string; title: string; description?: string }> };
                }>;
              };
              const sections = (sectionsCol.section ?? []).map((s) => ({
                title: s.title || undefined,
                rows: (s.rows?.row ?? []).map((r) =>
                  cleanUndefined({
                    id: r.id,
                    title: r.title,
                    description: r.description || undefined,
                  }),
                ),
              }));
              interactive.action = {
                button: this.getNodeParameter('listButton', i, 'Open') as string,
                sections,
              };
            }

            payload = withContext({ ...payload, type: 'interactive', interactive }, replyTo);
            break;
          }

          case 'sendReaction': {
            const messageId = this.getNodeParameter('reactionMessageId', i) as string;
            const emoji = this.getNodeParameter('emoji', i, '') as string;
            payload = {
              ...payload,
              type: 'reaction',
              reaction: { message_id: messageId, emoji },
            };
            break;
          }

          case 'sendTemplate': {
            const templateId = this.getNodeParameter('templateName', i) as string;
            if (!templateId) {
              throw new NodeOperationError(this.getNode(), 'Select a template to send.', {
                itemIndex: i,
              });
            }

            let template = templateCache.get(templateId);
            if (!template) {
              const templates = await fetchMessageTemplates.call(this);
              for (const t of templates) {
                templateCache.set(String(t.id ?? t.name), t);
              }
              template = templateCache.get(templateId);
            }
            if (!template) {
              throw new NodeOperationError(
                this.getNode(),
                `Template "${templateId}" was not found on the WABA. It may have been deleted or renamed.`,
                { itemIndex: i },
              );
            }

            const basePayload = template.json as IDataObject | undefined;
            if (!basePayload) {
              throw new NodeOperationError(this.getNode(), `Template "${template.name}" does not expose a json payload.`, { itemIndex: i });
            }

            const mapperValue = this.getNodeParameter('templateVariables', i, {}) as {
              value?: Record<string, unknown> | null;
            };
            const userValues = mapperValue.value ?? {};

            const vars: Record<string, string> = { waba: to };
            for (const [key, raw] of Object.entries(userValues)) {
              vars[key] = raw == null ? '' : String(raw);
            }

            payload = substitutePlaceholders(basePayload, vars) as IDataObject;
            payload.to = to;
            if (replyTo) {
              payload.context = { message_id: replyTo };
            }
            break;
          }

          default:
            throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
              itemIndex: i,
            });
        }

        const response = await sendMessage.call(this, payload);

        returnData.push({
          json: response as unknown as IDataObject,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

type ContactInput = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  formatted_name?: string;
  prefix?: string;
  suffix?: string;
  birthday?: string;
  org?: {
    value?: { company?: string; department?: string; title?: string };
  };
  phones?: { phone?: Array<{ phone?: string; type?: string; wa_id?: string }> };
  emails?: { email?: Array<{ email?: string; type?: string }> };
  urls?: { url?: Array<{ url?: string; type?: string }> };
  addresses?: {
    address?: Array<{
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      country_code?: string;
      type?: string;
    }>;
  };
};

function buildContactPayload(input: ContactInput): IDataObject {
  const contact: IDataObject = {};

  const formattedFallback = [input.first_name, input.middle_name, input.last_name]
    .filter((part) => part && part.trim().length > 0)
    .join(' ')
    .trim();
  const name = cleanUndefined({
    formatted_name: input.formatted_name?.trim() || formattedFallback || undefined,
    first_name: input.first_name || undefined,
    last_name: input.last_name || undefined,
    middle_name: input.middle_name || undefined,
    prefix: input.prefix || undefined,
    suffix: input.suffix || undefined,
  });
  if (Object.keys(name).length > 0) {
    contact.name = name;
  }

  if (input.birthday) {
    contact.birthday = input.birthday;
  }

  const orgValues = input.org?.value;
  if (orgValues) {
    const org = cleanUndefined({
      company: orgValues.company || undefined,
      department: orgValues.department || undefined,
      title: orgValues.title || undefined,
    });
    if (Object.keys(org).length > 0) contact.org = org;
  }

  const phones = (input.phones?.phone ?? [])
    .map((p) =>
      cleanUndefined({
        phone: p.phone || undefined,
        type: p.type || undefined,
        wa_id: p.wa_id || undefined,
      }),
    )
    .filter((p) => p.phone);
  if (phones.length) contact.phones = phones;

  const emails = (input.emails?.email ?? [])
    .map((e) =>
      cleanUndefined({
        email: e.email || undefined,
        type: e.type || undefined,
      }),
    )
    .filter((e) => e.email);
  if (emails.length) contact.emails = emails;

  const urls = (input.urls?.url ?? [])
    .map((u) =>
      cleanUndefined({
        url: u.url || undefined,
        type: u.type || undefined,
      }),
    )
    .filter((u) => u.url);
  if (urls.length) contact.urls = urls;

  const addresses = (input.addresses?.address ?? [])
    .map((a) =>
      cleanUndefined({
        street: a.street || undefined,
        city: a.city || undefined,
        state: a.state || undefined,
        zip: a.zip || undefined,
        country: a.country || undefined,
        country_code: a.country_code || undefined,
        type: a.type || undefined,
      }),
    )
    .filter((a) => Object.keys(a).length > 0);
  if (addresses.length) contact.addresses = addresses;

  return contact;
}
