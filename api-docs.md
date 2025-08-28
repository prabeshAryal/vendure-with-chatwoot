Of course. Here is a clean, minimalist, and well-formatted API documentation based on the information you provided.

# **Chatwoot Public API**

This document provides a comprehensive guide to using the Chatwoot Public API for managing contacts, conversations, and messages. The base URL for all endpoints is `https://app.chatwoot.com`.

-----

## **Contacts API**

Manage customer contact information.

### **1. Create a Contact**

Creates a new contact within a specific inbox.

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts`
  - **Description:** This endpoint is used to create a new contact. You must provide an `inbox_identifier` to associate the contact with the correct channel.

#### **Path Parameters**

| Parameter          | Type   | Required | Description                               |
| :----------------- | :----- | :------- | :---------------------------------------- |
| `inbox_identifier` | string | Yes      | The unique identifier for the API inbox.  |

#### **Body Parameters**

| Parameter           | Type   | Required | Description                                         | Example                             |
| :------------------ | :----- | :------- | :-------------------------------------------------- | :---------------------------------- |
| `name`              | string | No       | Name of the contact.                                | `"Alice"`                           |
| `email`             | string | No       | Email address of the contact.                       | `"alice@acme.inc"`                  |
| `phone_number`      | string | No       | Phone number of the contact.                        | `"+123456789"`                      |
| `identifier`        | string | No       | An external identifier for the contact.             | `"1234567890"`                      |
| `identifier_hash`   | string | No       | HMAC hash for authentication, if configured.        | `e932...`                           |
| `custom_attributes` | object | No       | Key-value pairs for custom data.                    | `{ "plan": "premium" }`             |

#### **Example Request**

```bash
curl --request POST \
  --url https://app.chatwoot.com/public/api/v1/inboxes/{inbox_identifier}/contacts \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Alice",
    "email": "alice@acme.inc",
    "phone_number": "+123456789"
  }'
```

#### **Success Response (200 OK)**

```json
{
  "id": 123,
  "source_id": "c1a2b3d4-e5f6-7890-1234-567890abcdef",
  "name": "Alice",
  "email": "alice@acme.inc",
  "pubsub_token": "your_websocket_token"
}
```

-----

### **2. Get a Contact**

Retrieves the details of a specific contact.

  - **Endpoint:** `GET /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}`

#### **Path Parameters**

| Parameter            | Type   | Required | Description                                                 |
| :------------------- | :----- | :------- | :---------------------------------------------------------- |
| `inbox_identifier`   | string | Yes      | The unique identifier for the API inbox.                    |
| `contact_identifier` | string | Yes      | The `source_id` of the contact obtained upon creation.      |

-----

### **3. Update a Contact**

Updates the attributes of an existing contact.

  - **Endpoint:** `PATCH /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}`

#### **Path Parameters**

| Parameter            | Type   | Required | Description                                                 |
| :------------------- | :----- | :------- | :---------------------------------------------------------- |
| `inbox_identifier`   | string | Yes      | The unique identifier for the API inbox.                    |
| `contact_identifier` | string | Yes      | The `source_id` of the contact obtained upon creation.      |

#### **Body Parameters**

Same as **Create a Contact**. Only include the fields you want to update.

-----

## **Conversations API**

Manage conversations with contacts.

### **1. List Conversations**

Retrieves all conversations for a specific contact.

  - **Endpoint:** `GET /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations`

#### **Path Parameters**

| Parameter            | Type   | Required | Description                                                 |
| :------------------- | :----- | :------- | :---------------------------------------------------------- |
| `inbox_identifier`   | string | Yes      | The unique identifier for the API inbox.                    |
| `contact_identifier` | string | Yes      | The `source_id` of the contact.                             |

#### **Success Response (200 OK)**

Returns an array of conversation objects.

```json
[
  {
    "id": 456,
    "inbox_id": "your_inbox_id",
    "messages": [ /* ... array of message objects ... */ ],
    "contact": { /* ... contact object ... */ }
  }
]
```

-----

### **2. Create a Conversation**

Initiates a new conversation with a contact.

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations`

#### **Path Parameters**

| Parameter            | Type   | Required | Description                                                 |
| :------------------- | :----- | :------- | :---------------------------------------------------------- |
| `inbox_identifier`   | string | Yes      | The unique identifier for the API inbox.                    |
| `contact_identifier` | string | Yes      | The `source_id` of the contact.                             |

-----

### **3. Get a Single Conversation**

Retrieves the details of a specific conversation.

  - **Endpoint:** `GET /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}`

#### **Path Parameters**

| Parameter            | Type    | Required | Description                             |
| :------------------- | :------ | :------- | :-------------------------------------- |
| `inbox_identifier`   | string  | Yes      | The unique identifier for the API inbox.|
| `contact_identifier` | string  | Yes      | The `source_id` of the contact.         |
| `conversation_id`    | integer | Yes      | The numeric ID of the conversation.     |

-----

### **4. Toggle Conversation Status**

Marks a conversation's status (e.g., as resolved).

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/toggle_status`

#### **Path Parameters**

Same as **Get a Single Conversation**.

-----

### **5. Toggle Typing Status**

Shows or hides the typing indicator for the contact.

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/toggle_typing`

#### **Path Parameters**

Same as **Get a Single Conversation**.

#### **Body Parameters**

| Parameter       | Type   | Required | Description                                |
| :-------------- | :----- | :------- | :----------------------------------------- |
| `typing_status` | string | Yes      | Set to `"on"` to show, `"off"` to hide.    |

-----

### **6. Update Last Seen**

Updates the timestamp of when the contact last viewed the conversation.

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/update_last_seen`

#### **Path Parameters**

Same as **Get a Single Conversation**.

-----

## **Messages API**

Send and manage individual messages within a conversation.

### **1. List Messages**

Retrieves all messages from a specific conversation.

  - **Endpoint:** `GET /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/messages`

#### **Path Parameters**

| Parameter            | Type    | Required | Description                             |
| :------------------- | :------ | :------- | :-------------------------------------- |
| `inbox_identifier`   | string  | Yes      | The unique identifier for the API inbox.|
| `contact_identifier` | string  | Yes      | The `source_id` of the contact.         |
| `conversation_id`    | integer | Yes      | The numeric ID of the conversation.     |

#### **Success Response (200 OK)**

Returns an array of message objects.

```json
[
  {
    "id": "789",
    "content": "Hello, how can I help you?",
    "message_type": "outgoing",
    "created_at": "2025-08-27T17:15:00.000Z",
    "conversation_id": "456",
    "attachments": [],
    "sender": { /* ... sender object ... */ }
  }
]
```

-----

### **2. Create a Message**

Sends a new message in a conversation.

  - **Endpoint:** `POST /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/messages`

#### **Path Parameters**

Same as **List Messages**.

#### **Body Parameters**

| Parameter | Type   | Required | Description                                                       |
| :-------- | :----- | :------- | :---------------------------------------------------------------- |
| `content` | string | Yes      | The text content of the message.                                  |
| `echo_id` | string | Yes      | A temporary client-side ID returned via WebSocket for matching.   |

-----

### **3. Update a Message**

Updates a message, typically used for submitting replies to bot message types (e.g., forms).

  - **Endpoint:** `PATCH /public/api/v1/inboxes/{inbox_identifier}/contacts/{contact_identifier}/conversations/{conversation_id}/messages/{message_id}`

#### **Path Parameters**

| Parameter            | Type    | Required | Description                             |
| :------------------- | :------ | :------- | :-------------------------------------- |
| `inbox_identifier`   | string  | Yes      | The unique identifier for the API inbox.|
| `contact_identifier` | string  | Yes      | The `source_id` of the contact.         |
| `conversation_id`    | integer | Yes      | The numeric ID of the conversation.     |
| `message_id`         | integer | Yes      | The numeric ID of the message.          |

#### **Body Parameters**

| Parameter          | Type   | Required | Description                            |
| :----------------- | :----- | :------- | :------------------------------------- |
| `submitted_values` | object | Yes      | An object containing the user's input. |

-----

## **CSAT Survey**

Manage Customer Satisfaction surveys.

### **1. Get CSAT Survey Page**

Provides a URL to a pre-built CSAT survey page for a conversation.

  - **Endpoint:** `GET /survey/responses/{conversation_uuid}`
  - **Description:** Redirect the user to this URL to collect their satisfaction rating and feedback for a conversation.

#### **Path Parameters**

| Parameter           | Type   | Required | Description                       |
| :------------------ | :----- | :------- | :-------------------------------- |
| `conversation_uuid` | string | Yes      | The UUID of the conversation.     |