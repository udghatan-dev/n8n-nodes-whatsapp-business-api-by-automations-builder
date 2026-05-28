import type { INodeProperties } from 'n8n-workflow';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
  show: {
    resource: ['message'],
    operation: operations,
  },
});

export const sessionMessageOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['message'] } },
    options: [
      {
        name: 'Send Contacts',
        value: 'sendContacts',
        action: 'Send a contact card',
        description: 'Send one or more contact cards',
      },
      {
        name: 'Send Interactive',
        value: 'sendInteractive',
        action: 'Send an interactive message',
        description: 'Send a reply-button or list message',
      },
      {
        name: 'Send Location',
        value: 'sendLocation',
        action: 'Send a location message',
        description: 'Send a geographic location',
      },
      {
        name: 'Send Media',
        value: 'sendMedia',
        action: 'Send a media message',
        description: 'Send an image, video, audio, document, or sticker',
      },
      {
        name: 'Send Reaction',
        value: 'sendReaction',
        action: 'Send a reaction',
        description: 'React to an existing message with an emoji',
      },
      {
        name: 'Send Template',
        value: 'sendTemplate',
        action: 'Send a template message',
        description: 'Send an approved template (works outside the 24-hour window)',
      },
      {
        name: 'Send Text',
        value: 'sendText',
        action: 'Send a text message',
        description: 'Send a plain text session message',
      },
    ],
    default: 'sendText',
  },
];

const recipientField: INodeProperties = {
  displayName: 'Recipient Phone Number',
  name: 'to',
  type: 'string',
  default: '',
  required: true,
  placeholder: '+15551234567',
  description: 'Recipient WhatsApp phone number in E.164 format, e.g. +15551234567. Whitespace and dashes are stripped.',
  displayOptions: {
    show: {
      resource: ['message'],
      operation: ['sendText', 'sendMedia', 'sendLocation', 'sendContacts', 'sendInteractive', 'sendReaction', 'sendTemplate'],
    },
  },
};

const replyToField: INodeProperties = {
  displayName: 'Reply to Message ID',
  name: 'replyTo',
  type: 'string',
  default: '',
  description: 'WhatsApp message ID (wamid) to quote-reply. Leave blank for a non-threaded message.',
  displayOptions: {
    show: {
      resource: ['message'],
      operation: ['sendText', 'sendMedia', 'sendLocation', 'sendContacts', 'sendInteractive'],
    },
  },
};

export const sessionMessageFields: INodeProperties[] = [
  recipientField,

  // ---------- Send Text ----------
  {
    displayName: 'Message Text',
    name: 'text',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
    displayOptions: showFor(['sendText']),
  },
  {
    displayName: 'Enable URL Preview',
    name: 'previewUrl',
    type: 'boolean',
    default: true,
    description: 'Whether to expand the first URL in the message into a preview card',
    displayOptions: showFor(['sendText']),
  },

  // ---------- Send Media ----------
  {
    displayName: 'Media Type',
    name: 'mediaType',
    type: 'options',
    default: 'image',
    options: [
      { name: 'Audio', value: 'audio' },
      { name: 'Document', value: 'document' },
      { name: 'Image', value: 'image' },
      { name: 'Sticker', value: 'sticker' },
      { name: 'Video', value: 'video' },
    ],
    displayOptions: showFor(['sendMedia']),
  },
  {
    displayName: 'Source',
    name: 'mediaSource',
    type: 'options',
    default: 'url',
    options: [
      { name: 'By Public URL', value: 'url' },
      { name: 'By Media ID', value: 'id' },
    ],
    description: 'Either a publicly reachable URL, or a media ID previously uploaded to WhatsApp',
    displayOptions: showFor(['sendMedia']),
  },
  {
    displayName: 'Media URL',
    name: 'mediaUrl',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendMedia'],
        mediaSource: ['url'],
      },
    },
  },
  {
    displayName: 'Media ID',
    name: 'mediaId',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendMedia'],
        mediaSource: ['id'],
      },
    },
  },
  {
    displayName: 'Caption',
    name: 'caption',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    description: 'Caption for image, video, or document. Ignored for audio and sticker.',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendMedia'],
        mediaType: ['image', 'video', 'document'],
      },
    },
  },
  {
    displayName: 'Filename',
    name: 'filename',
    type: 'string',
    default: '',
    description: 'Filename for documents (e.g. invoice.pdf). Ignored for other media types.',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendMedia'],
        mediaType: ['document'],
      },
    },
  },

  // ---------- Send Location ----------
  {
    displayName: 'Latitude',
    name: 'latitude',
    type: 'number',
    typeOptions: { numberPrecision: 7 },
    default: 0,
    required: true,
    displayOptions: showFor(['sendLocation']),
  },
  {
    displayName: 'Longitude',
    name: 'longitude',
    type: 'number',
    typeOptions: { numberPrecision: 7 },
    default: 0,
    required: true,
    displayOptions: showFor(['sendLocation']),
  },
  {
    displayName: 'Location Name',
    name: 'locationName',
    type: 'string',
    default: '',
    displayOptions: showFor(['sendLocation']),
  },
  {
    displayName: 'Address',
    name: 'address',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    displayOptions: showFor(['sendLocation']),
  },

  // ---------- Send Contacts ----------
  {
    displayName: 'Contacts',
    name: 'contacts',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true, sortable: true },
    default: {},
    placeholder: 'Add Contact',
    description: 'One or more contact cards to send',
    displayOptions: showFor(['sendContacts']),
    options: [
      {
        name: 'contact',
        displayName: 'Contact',
        values: [
							{
								displayName: 'Addresses',
								name: 'addresses',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Address',
								options: [
											{
												name: 'address',
												displayName: 'Address',
													values:	[
													{
														displayName: 'Street',
														name: 'street',
														type: 'string',
														default: '',
													},
													{
														displayName: 'City',
														name: 'city',
														type: 'string',
														default: '',
													},
													{
														displayName: 'State',
														name: 'state',
														type: 'string',
														default: '',
													},
													{
														displayName: 'Zip',
														name: 'zip',
														type: 'string',
														default: '',
													},
													{
														displayName: 'Country',
														name: 'country',
														type: 'string',
														default: '',
													},
													{
														displayName: 'Country Code',
														name: 'country_code',
														type: 'string',
														default: '',
														description: 'ISO 3166-1 alpha-2 code, e.g. US',
													},
													{
														displayName: 'Type',
														name: 'type',
														type: 'options',
														default: 'HOME',
														options: [
																	{
																		name: 'Home',
																		value: 'HOME',
																	},
																	{
																		name: 'Work',
																		value: 'WORK',
																	},
																	{
																		name: 'Other',
																		value: 'OTHER',
																	},
																]
													},
													]
											},
									]
							},
							{
								displayName: 'Birthday',
								name: 'birthday',
								type: 'string',
								default: '',
								placeholder: 'YYYY-MM-DD',
								description: 'Date of birth in YYYY-MM-DD format',
							},
							{
								displayName: 'Emails',
								name: 'emails',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Email',
								options: [
											{
												name: 'email',
												displayName: 'Email',
													values:	[
													{
														displayName: 'Email Address',
														name: 'email',
														type: 'string',
														default: '',
															required:	true,
														placeholder: 'jane@example.com',
													},
													{
														displayName: 'Type',
														name: 'type',
														type: 'options',
														default: 'HOME',
														options: [
																	{
																		name: 'Home',
																		value: 'HOME',
																	},
																	{
																		name: 'Work',
																		value: 'WORK',
																	},
																	{
																		name: 'Other',
																		value: 'OTHER',
																	},
															]
													},
													]
											},
									]
							},
							{
								displayName: 'First Name',
								name: 'first_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Formatted Name',
								name: 'formatted_name',
								type: 'string',
								default: '',
								description: 'Full display name shown to the recipient. If blank, generated from first/middle/last.',
							},
							{
								displayName: 'Last Name',
								name: 'last_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Middle Name',
								name: 'middle_name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Organization',
								name: 'org',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Organization',
								options: [
											{
												name: 'value',
												displayName: 'Organization',
													values:	[
													{
														displayName: 'Company',
														name: 'company',
														type: 'string',
														default: '',
													},
													{
														displayName: 'Department',
														name: 'department',
														type: 'string',
														default: '',
													},
													{
														displayName: 'Title',
														name: 'title',
														type: 'string',
														default: '',
													},
													]
											},
									]
							},
							{
								displayName: 'Phones',
								name: 'phones',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Phone',
								options: [
											{
												name: 'phone',
												displayName: 'Phone',
													values:	[
													{
														displayName: 'Phone Number',
														name: 'phone',
														type: 'string',
														default: '',
															required:	true,
														placeholder: '+15551234567',
													},
													{
														displayName: 'Type',
														name: 'type',
														type: 'options',
														default: 'CELL',
														options: [
																	{
																		name: 'Cell',
																		value: 'CELL',
																	},
																	{
																		name: 'Home',
																		value: 'HOME',
																	},
																	{
																		name: 'iPhone',
																		value: 'IPHONE',
																	},
																	{
																		name: 'Main',
																		value: 'MAIN',
																	},
																	{
																		name: 'Other',
																		value: 'OTHER',
																	},
																	{
																		name: 'Work',
																		value: 'WORK',
																	},
															]
													},
													{
														displayName: 'WhatsApp ID',
														name: 'wa_id',
														type: 'string',
														default: '',
														description: 'WhatsApp ID (wa_id) for this number, if known',
													},
													]
											},
									]
							},
							{
								displayName: 'Prefix',
								name: 'prefix',
								type: 'string',
								default: '',
								description: 'Honorific (Mr., Dr., etc.)',
							},
							{
								displayName: 'Suffix',
								name: 'suffix',
								type: 'string',
								default: '',
								description: 'Suffix (Jr., PhD, etc.)',
							},
							{
								displayName: 'Websites',
								name: 'urls',
								type: 'fixedCollection',
								default: {},
								placeholder: 'Add Website',
								options: [
											{
												name: 'url',
												displayName: 'Website',
													values:	[
													{
														displayName: 'URL',
														name: 'url',
														type: 'string',
														default: '',
															required:	true,
														placeholder: 'https://example.com',
													},
													{
														displayName: 'Type',
														name: 'type',
														type: 'options',
														default: 'HOME',
														options: [
																	{
																		name: 'Home',
																		value: 'HOME',
																	},
																	{
																		name: 'Work',
																		value: 'WORK',
																	},
																	{
																		name: 'Other',
																		value: 'OTHER',
																	},
															]
													},
													]
											},
									]
							},
					],
      },
    ],
  },

  // ---------- Send Interactive ----------
  {
    displayName: 'Interactive Type',
    name: 'interactiveType',
    type: 'options',
    default: 'button',
    options: [
      { name: 'Reply Buttons', value: 'button' },
      { name: 'List', value: 'list' },
    ],
    displayOptions: showFor(['sendInteractive']),
  },
  {
    displayName: 'Body Text',
    name: 'interactiveBody',
    type: 'string',
    typeOptions: { rows: 3 },
    default: '',
    required: true,
    displayOptions: showFor(['sendInteractive']),
  },
  {
    displayName: 'Header Type',
    name: 'headerType',
    type: 'options',
    default: 'none',
    description: 'Optional header shown above the message body',
    options: [
      { name: 'Document', value: 'document' },
      { name: 'Image', value: 'image' },
      { name: 'None', value: 'none' },
      { name: 'Text', value: 'text' },
      { name: 'Video', value: 'video' },
    ],
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        interactiveType: ['button'],
      },
    },
  },
  {
    displayName: 'Header Type',
    name: 'headerType',
    type: 'options',
    default: 'none',
    description: 'List messages only support a text header (or no header)',
    options: [
      { name: 'None', value: 'none' },
      { name: 'Text', value: 'text' },
    ],
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        interactiveType: ['list'],
      },
    },
  },
  {
    displayName: 'Header Text',
    name: 'interactiveHeaderText',
    type: 'string',
    default: '',
    description: 'Plain-text header (max 60 characters)',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        headerType: ['text'],
      },
    },
  },
  {
    displayName: 'Header Media URL',
    name: 'interactiveHeaderMediaUrl',
    type: 'string',
    default: '',
    required: true,
    description: 'Publicly reachable URL for the header media',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        headerType: ['image', 'video', 'document'],
      },
    },
  },
  {
    displayName: 'Header Document Filename',
    name: 'interactiveHeaderFilename',
    type: 'string',
    default: '',
    description: 'Filename shown to the recipient (e.g. invoice.pdf)',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        headerType: ['document'],
      },
    },
  },
  {
    displayName: 'Footer Text',
    name: 'interactiveFooter',
    type: 'string',
    default: '',
    displayOptions: showFor(['sendInteractive']),
  },
  {
    displayName: 'Buttons',
    name: 'buttons',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true, sortable: true },
    default: {},
    placeholder: 'Add Button',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        interactiveType: ['button'],
      },
    },
    options: [
      {
        name: 'button',
        displayName: 'Button',
        values: [
          {
            displayName: 'ID',
            name: 'id',
            type: 'string',
            default: '',
            required: true,
            description: 'Unique ID returned in the webhook when the user taps this button',
          },
          {
            displayName: 'Title',
            name: 'title',
            type: 'string',
            default: '',
            required: true,
            description: 'Button label (max 20 characters)',
          },
        ],
      },
    ],
  },
  {
    displayName: 'List Button Text',
    name: 'listButton',
    type: 'string',
    default: 'Open',
    description: 'Label of the button that opens the list (max 20 characters)',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        interactiveType: ['list'],
      },
    },
  },
  {
    displayName: 'Sections',
    name: 'sections',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true, sortable: true },
    default: {},
    placeholder: 'Add Section',
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendInteractive'],
        interactiveType: ['list'],
      },
    },
    options: [
      {
        name: 'section',
        displayName: 'Section',
        values: [
          { displayName: 'Title', name: 'title', type: 'string', default: '' },
          {
            displayName: 'Rows',
            name: 'rows',
            type: 'fixedCollection',
            typeOptions: { multipleValues: true, sortable: true },
            default: {},
            placeholder: 'Add Row',
            options: [
              {
                name: 'row',
                displayName: 'Row',
                values: [
                  { displayName: 'ID', name: 'id', type: 'string', default: '', required: true },
                  {
                    displayName: 'Title',
                    name: 'title',
                    type: 'string',
                    default: '',
                    required: true,
                  },
                  {
                    displayName: 'Description',
                    name: 'description',
                    type: 'string',
                    default: '',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ---------- Send Reaction ----------
  {
    displayName: 'Message ID',
    name: 'reactionMessageId',
    type: 'string',
    default: '',
    required: true,
    description: 'WhatsApp message ID (wamid) to react to',
    displayOptions: showFor(['sendReaction']),
  },
  {
    displayName: 'Emoji',
    name: 'emoji',
    type: 'string',
    default: '',
    required: true,
    description: 'Single emoji to react with. Send an empty string to remove a previous reaction.',
    displayOptions: showFor(['sendReaction']),
  },

  replyToField,
];
