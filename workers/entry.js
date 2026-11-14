// Cloudflare Workers executa a API Express com compatibilidade Node.
// Assets React são servidos pelo Workers Assets na mesma origem.
import { env } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';
import { createApp } from '../server/src/app.js';
import { assertConfig } from '../server/src/config.js';

globalThis.__CF_ENV = env;

const app = createApp({ staticFiles: false });
app.listen(3000);

export default {
  fetch(request) {
    assertConfig();
    return handleAsNodeRequest(3000, request);
  },
};
