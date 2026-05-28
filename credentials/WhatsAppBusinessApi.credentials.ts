import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WhatsAppBusinessApi implements ICredentialType {
  name = 'whatsAppBusinessApi';

  displayName = 'WhatsApp Business API';

  documentationUrl = 'https://documenter.getpostman.com/view/14215086/2sA3e2hAeY#d136d7bd-41a3-4b9c-87fb-b1b2fbaf4a4e';

  properties: INodeProperties[] = [
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Permanent System User access token with whatsapp_business_messaging and whatsapp_business_management scopes.',
    },
    {
      displayName: 'Phone Number ID',
      name: 'phoneNumberId',
      type: 'string',
      default: '',
      required: true,
      description: 'The WhatsApp Business phone number ID used to send messages (found in the Meta App dashboard).',
    },
    {
      displayName: 'WABA ID',
      name: 'businessAccountId',
      type: 'string',
      default: '',
      required: true,
      description: 'WhatsApp Business Account (WABA) ID. Used for management endpoints.',
    },
    {
      displayName: 'Graph API Version',
      name: 'apiVersion',
      type: 'string',
      default: 'v22.0',
      description: 'Graph API version segment used in the base URL (e.g. v22.0).',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.accessToken}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '=https://crmapi.1automations.com/api/meta/{{$credentials.apiVersion}}',
      url: '=/{{$credentials.phoneNumberId}}',
      method: 'GET',
    },
  };
}
