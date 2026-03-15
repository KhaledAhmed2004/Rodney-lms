# Screen 13: Legal

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)

---

### 13.1 Create Legal Page

```
POST /legal
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "title": "Terms of Service",
  "content": "<h1>Terms of Service</h1><p>Welcome...</p>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms of Service</h1><p>Welcome...</p>",
    "createdAt": "2026-03-14T10:00:00Z",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 13.2 Get All / Get by Slug / Update / Delete

```
GET    /legal            — Same as App [10.3](#103-get-legal-pages)
GET    /legal/:slug      — Same as App [10.4](#104-get-legal-page-by-slug)
PATCH  /legal/:slug      — Updated legal page object
DELETE /legal/:slug      — { success: true, message: "Legal page deleted" }
```

---
