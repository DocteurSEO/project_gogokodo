import { Hono } from 'hono';
import { cors } from 'hono/cors'
import { html } from 'hono/html';

const app = new Hono();
app.use('*', cors());	

// Helper function to get template and content
async function getTemplateAndContent(env, path) {
  const contentKey = path.replace('/', '');
  const content = await env.CONTENT.get(contentKey, { type: 'json' });
  
  if (!content) return null;
  
  const template = await env.TEMPLATES.get(content.templateId.toString(), { type: 'json' });
 
  return { template, content };
}

async function getTemplate(env, id) {
  return await env.TEMPLATES.get(id.toString(), { type: 'json' });
}

async function getContent(env, path) {
  const contentKey = path.replace('/', '');
  return await env.CONTENT.get(contentKey, { type: 'json' });
}

// Middleware to handle dynamic routes
app.get('/:path', async (c) => {
  const data = await getTemplateAndContent(c.env, c.req.path);
  
  if (!data) {
    return c.text('Not Found', 404);
  }

  const { template, content, } = data;

 

  
  // Render the template with content
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${content.title ?? 'Go Go KoDO'}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">  
		<style>
		${content.style ?? ''}
        </style>
      </head>
      </head>
      <body>
        ${html([template.structure.replace('{{content}}', content.content)])}
      </body>
      <script defer>
        document.addEventListener('DOMContentLoaded', function() {
          ${html([ content.script ?? '' ])}
        });
      </script>
    </html>
  `);
});

// Root route
app.get('/', (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Welcome to GoGoKodo</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <h1>Welcome to GoGoKodo</h1>
        <p>Visit /{path} to see content with templates</p>
      </body>
    </html>
  `);
});

// Middleware to check admin token
const checkAdminToken = async (c, next) => {
  const adminToken = c.req.header('Authorization');
  console.log(adminToken)
  if (!adminToken || adminToken !== c.env.ISADMIN) {
    return c.json({ error: 'Unauthorized - Invalid admin token' }, 401);
  }
  await next();
};

// POST route for creating templates
app.post('/template', checkAdminToken, async (c) => {
  const body = await c.req.json();
  
  if (!body.id || !body.structure) {
    return c.json({ error: 'Missing required fields: id and structure' }, 400);
  }
  
  await c.env.TEMPLATES.put(body.id.toString(), JSON.stringify({
    structure: body.structure
  }));
  
  return c.json({ message: 'Template created successfully' }, 201);
});

// GET route for template by ID
app.get('/template/:id', async (c) => {
  const template = await getTemplate(c.env, c.req.param('id'));
  
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }
  console.log(template)
  
  return c.json(template, );
});

// GET route for content by path
app.get('/content/:path', async (c) => {
  const content = await getContent(c.env, c.req.param('path'));
  
  if (!content) {
    return c.json({ error: 'Content not found' }, 404);
  }
  
  return c.json(content);
});

// POST route for creating content
app.post('/', checkAdminToken, async (c) => {
  const body = await c.req.json();
  
  if (!body.path || !body.templateId || !body.title || !body.content) {
    return c.json({ error: 'Missing required fields: path, templateId, title, and content' }, 400);
  }
  
  // Transform and validate content
  const contentToStore = {
    templateId: body.templateId,
    title: body.title,
    content: body.content,
    style: body.style || '',
    script: body.script || ''
  };
  
  await c.env.CONTENT.put(body.path, JSON.stringify(contentToStore));
  
  return c.json({ message: 'Content created successfully' }, 201);
});

export default app;
