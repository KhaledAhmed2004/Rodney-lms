# Screen 14: Profile

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Auth](./01-auth.md)

---

### 14.1 Get Own Profile / Update Profile

> Same response shapes as App Profile Screen ([10.1](#101-get-own-profile), [10.2](#102-update-profile)), but role will be `SUPER_ADMIN` and student-specific fields will be excluded.
