/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('index.html', () => {
  let htmlContent;

  beforeAll(() => {
    // Read the index.html file
    htmlContent = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  });

  test('contains proper HTML structure', () => {
    expect(htmlContent).toMatch(/<!DOCTYPE html>/);
    expect(htmlContent).toMatch(/<html>/);
    expect(htmlContent).toMatch(/<head>/);
    expect(htmlContent).toMatch(/<body>/);
  });

  test('contains required meta tags', () => {
    expect(htmlContent).toMatch(/<meta charset="UTF-8">/);
    expect(htmlContent).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1.0">/);
  });

  test('contains title', () => {
    expect(htmlContent).toMatch(/<title>Local Knowledge Agent<\/title>/);
  });

  test('contains welcome message', () => {
    expect(htmlContent).toMatch(/<h1>Local Knowledge Agent<\/h1>/);
  });

  test('contains required script tags', () => {
    expect(htmlContent).toMatch(/<script src="renderer.js"><\/script>/);
  });

  test('contains required style tags', () => {
    expect(htmlContent).toMatch(/<style>/);
    expect(htmlContent).toMatch(/<\/style>/);
  });

  test('contains basic styling', () => {
    expect(htmlContent).toMatch(/body {/);
    expect(htmlContent).toMatch(/font-family:/);
    expect(htmlContent).toMatch(/margin:/);
    expect(htmlContent).toMatch(/padding:/);
  });

  test('contains settings panel', () => {
    expect(htmlContent).toMatch(/<div id="settings-panel">/);
    expect(htmlContent).toMatch(/<div id="model-status">/);
    expect(htmlContent).toMatch(/<select id="model-select">/);
  });

  test('contains chat interface', () => {
    expect(htmlContent).toMatch(/<div id="chat-interface">/);
    expect(htmlContent).toMatch(/<div class="chat-container" id="chat-messages">/);
    expect(htmlContent).toMatch(/<form id="query-form">/);
  });
}); 