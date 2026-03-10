/**
 * RequestHelper - Supertest wrapper for cleaner HTTP testing
 *
 * @example
 * const res = await TestBuilder.request(app)
 *   .auth(token)
 *   .get('/api/v1/users')
 *   .expect(200);
 */

import request, { Test, Response } from 'supertest';
import { Express } from 'express';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, any>;
  timeout?: number;
}

// ════════════════════════════════════════════════════════════
// REQUEST HELPER CLASS
// ════════════════════════════════════════════════════════════

export class RequestHelper {
  private app: Express;
  private authToken: string | null = null;
  private customHeaders: Record<string, string> = {};
  private defaultTimeout: number = 5000;

  constructor(app: Express) {
    this.app = app;
  }

  // ════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ════════════════════════════════════════════════════════════

  /**
   * Set authorization token for subsequent requests
   *
   * @param token - JWT token (without 'Bearer' prefix)
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .get('/api/v1/profile')
   *   .expect(200);
   */
  auth(token: string): this {
    this.authToken = token;
    return this;
  }

  /**
   * Clear authentication token
   */
  noAuth(): this {
    this.authToken = null;
    return this;
  }

  // ════════════════════════════════════════════════════════════
  // HEADERS
  // ════════════════════════════════════════════════════════════

  /**
   * Set custom header
   *
   * @example
   * request.setHeader('X-Custom-Header', 'value')
   */
  setHeader(key: string, value: string): this {
    this.customHeaders[key] = value;
    return this;
  }

  /**
   * Set multiple headers
   */
  setHeaders(headers: Record<string, string>): this {
    this.customHeaders = { ...this.customHeaders, ...headers };
    return this;
  }

  /**
   * Clear custom headers
   */
  clearHeaders(): this {
    this.customHeaders = {};
    return this;
  }

  /**
   * Set Content-Type header
   */
  contentType(type: string): this {
    return this.setHeader('Content-Type', type);
  }

  /**
   * Set Accept header
   */
  accept(type: string): this {
    return this.setHeader('Accept', type);
  }

  // ════════════════════════════════════════════════════════════
  // HTTP METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Make a GET request
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .get('/api/v1/users')
   *   .expect(200);
   */
  get(url: string, query?: Record<string, any>): TestWrapper {
    let req = request(this.app).get(url);
    req = this.applyAuth(req);
    req = this.applyHeaders(req);

    if (query) {
      req = req.query(query);
    }

    return new TestWrapper(req);
  }

  /**
   * Make a POST request
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .post('/api/v1/users', { name: 'John', email: 'john@test.com' })
   *   .expect(201);
   */
  post(url: string, body?: any): TestWrapper {
    let req = request(this.app).post(url);
    req = this.applyAuth(req);
    req = this.applyHeaders(req);

    if (body) {
      req = req.send(body);
    }

    return new TestWrapper(req);
  }

  /**
   * Make a PUT request
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .put('/api/v1/users/123', { name: 'Updated Name' })
   *   .expect(200);
   */
  put(url: string, body?: any): TestWrapper {
    let req = request(this.app).put(url);
    req = this.applyAuth(req);
    req = this.applyHeaders(req);

    if (body) {
      req = req.send(body);
    }

    return new TestWrapper(req);
  }

  /**
   * Make a PATCH request
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .patch('/api/v1/users/123', { name: 'Updated Name' })
   *   .expect(200);
   */
  patch(url: string, body?: any): TestWrapper {
    let req = request(this.app).patch(url);
    req = this.applyAuth(req);
    req = this.applyHeaders(req);

    if (body) {
      req = req.send(body);
    }

    return new TestWrapper(req);
  }

  /**
   * Make a DELETE request
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .delete('/api/v1/users/123')
   *   .expect(200);
   */
  delete(url: string, body?: any): TestWrapper {
    let req = request(this.app).delete(url);
    req = this.applyAuth(req);
    req = this.applyHeaders(req);

    if (body) {
      req = req.send(body);
    }

    return new TestWrapper(req);
  }

  /**
   * Upload file(s)
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .upload('/api/v1/users/avatar', 'avatar', './test-image.jpg')
   *   .expect(200);
   */
  upload(url: string, field: string, filePath: string): TestWrapper {
    let req = request(this.app).post(url);
    req = this.applyAuth(req);

    // Apply headers except Content-Type (let supertest handle multipart)
    for (const [key, value] of Object.entries(this.customHeaders)) {
      if (key.toLowerCase() !== 'content-type') {
        req = req.set(key, value);
      }
    }

    req = req.attach(field, filePath);

    return new TestWrapper(req);
  }

  /**
   * Upload multiple files
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .uploadMany('/api/v1/users/gallery', 'images', ['./img1.jpg', './img2.jpg'])
   *   .expect(200);
   */
  uploadMany(url: string, field: string, filePaths: string[]): TestWrapper {
    let req = request(this.app).post(url);
    req = this.applyAuth(req);

    // Apply headers except Content-Type
    for (const [key, value] of Object.entries(this.customHeaders)) {
      if (key.toLowerCase() !== 'content-type') {
        req = req.set(key, value);
      }
    }

    for (const filePath of filePaths) {
      req = req.attach(field, filePath);
    }

    return new TestWrapper(req);
  }

  /**
   * Upload file with additional fields
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .uploadWithFields('/api/v1/posts', {
   *     files: { image: './photo.jpg' },
   *     fields: { title: 'My Post', content: 'Hello!' }
   *   })
   *   .expect(201);
   */
  uploadWithFields(
    url: string,
    data: { files: Record<string, string>; fields?: Record<string, any> }
  ): TestWrapper {
    let req = request(this.app).post(url);
    req = this.applyAuth(req);

    // Apply headers except Content-Type
    for (const [key, value] of Object.entries(this.customHeaders)) {
      if (key.toLowerCase() !== 'content-type') {
        req = req.set(key, value);
      }
    }

    // Add files
    for (const [field, filePath] of Object.entries(data.files)) {
      req = req.attach(field, filePath);
    }

    // Add fields
    if (data.fields) {
      for (const [field, value] of Object.entries(data.fields)) {
        req = req.field(field, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    return new TestWrapper(req);
  }

  // ════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════

  /**
   * Apply authorization header
   */
  private applyAuth(req: Test): Test {
    if (this.authToken) {
      return req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req;
  }

  /**
   * Apply custom headers
   */
  private applyHeaders(req: Test): Test {
    for (const [key, value] of Object.entries(this.customHeaders)) {
      req = req.set(key, value);
    }
    return req;
  }
}

// ════════════════════════════════════════════════════════════
// TEST WRAPPER - Chainable assertion helper
// ════════════════════════════════════════════════════════════

export class TestWrapper implements PromiseLike<Response> {
  private req: Test;

  constructor(req: Test) {
    this.req = req;
  }

  /**
   * Expect HTTP status code
   *
   * @example
   * await request.get('/api/v1/users').expect(200);
   */
  expect(status: number): this {
    this.req = this.req.expect(status);
    return this;
  }

  /**
   * Expect header value
   *
   * @example
   * await request.get('/api/v1/users').expectHeader('Content-Type', /json/);
   */
  expectHeader(key: string, value: string | RegExp): this {
    if (typeof value === 'string') {
      this.req = this.req.expect(key, value);
    } else {
      this.req = this.req.expect(key, value);
    }
    return this;
  }

  /**
   * Expect body to match
   *
   * @example
   * await request.get('/api/v1/users').expectBody({ success: true });
   */
  expectBody(body: any): this {
    this.req = this.req.expect(body);
    return this;
  }

  /**
   * Set timeout for this request
   */
  timeout(ms: number): this {
    this.req = this.req.timeout(ms);
    return this;
  }

  /**
   * Add custom assertion function
   *
   * @example
   * await request.get('/api/v1/users').expectFn((res) => {
   *   expect(res.body.data.length).toBeGreaterThan(0);
   * });
   */
  expectFn(fn: (res: Response) => void): this {
    this.req = this.req.expect(fn);
    return this;
  }

  /**
   * Set request timeout
   */
  withTimeout(ms: number): this {
    this.req = this.req.timeout(ms);
    return this;
  }

  /**
   * Add query parameters
   */
  query(params: Record<string, any>): this {
    this.req = this.req.query(params);
    return this;
  }

  /**
   * Set Content-Type
   */
  type(contentType: string): this {
    this.req = this.req.type(contentType);
    return this;
  }

  /**
   * Set Accept header
   */
  accept(type: string): this {
    this.req = this.req.accept(type);
    return this;
  }

  /**
   * Set custom header
   */
  set(key: string, value: string): this {
    this.req = this.req.set(key, value);
    return this;
  }

  /**
   * Set authorization token
   *
   * @example
   * await request.get('/api/v1/profile').auth(token).expect(200);
   */
  auth(token: string): this {
    this.req = this.req.set('Authorization', `Bearer ${token}`);
    return this;
  }

  /**
   * Alias for set() - for compatibility
   *
   * @example
   * await request.get('/api/v1/users').setHeader('x-page', '1').expect(200);
   */
  setHeader(key: string, value: string): this {
    return this.set(key, value);
  }

  /**
   * Send request body (for POST/PUT/PATCH)
   *
   * @example
   * await request.post('/api/v1/users').send({ name: 'John' }).expect(201);
   */
  send(body: any): this {
    this.req = this.req.send(body);
    return this;
  }

  /**
   * Implement PromiseLike interface
   */
  then<TResult1 = Response, TResult2 = never>(
    onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.req.then(onfulfilled, onrejected);
  }

  /**
   * Get the underlying supertest Test object
   */
  getRequest(): Test {
    return this.req;
  }
}
