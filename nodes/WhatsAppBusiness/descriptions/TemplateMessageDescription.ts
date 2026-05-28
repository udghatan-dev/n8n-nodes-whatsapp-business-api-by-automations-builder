import type { INodeProperties } from 'n8n-workflow';

const showForTemplate: INodeProperties['displayOptions'] = {
  show: {
    resource: ['message'],
    operation: ['sendTemplate'],
  },
};

export const templateMessageFields: INodeProperties[] = [
  {
    displayName: 'Template Name or ID',
    name: 'templateName',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getTemplates',
    },
    default: '',
    required: true,
    description: 'Approved WhatsApp message template. Loaded from the WABA configured on the credential. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
    displayOptions: showForTemplate,
  },
  {
    displayName: 'Variables',
    name: 'templateVariables',
    type: 'resourceMapper',
    default: { mappingMode: 'defineBelow', value: null },
    required: true,
    typeOptions: {
      loadOptionsDependsOn: ['templateName'],
      resourceMapper: {
        resourceMapperMethod: 'getTemplateVariables',
        mode: 'add',
        fieldWords: { singular: 'variable', plural: 'variables' },
        addAllFields: true,
        multiKeyMatch: false,
        supportAutoMap: false,
        noFieldsError: 'This template has no variables to fill in.',
      },
    },
    description:
      'Values for the placeholders declared by the template (e.g. body#1, header#image). The {{waba}} placeholder is replaced automatically with the recipient.',
    displayOptions: showForTemplate,
  },
];
