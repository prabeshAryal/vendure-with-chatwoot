// Shim to neutralize deprecated util._extend usage in transitive dependency (http-proxy)
// Safe because util._extend performed a shallow copy just like Object.assign.
try {
    const u: any = require('util');
    if (u && u._extend) {
        u._extend = Object.assign;
    }
} catch {}
import { bootstrap, runMigrations, VendureBootstrapFunction, Logger } from '@vendure/core';
import { config } from './vendure-config';

runMigrations(config)
    .then(() => bootstrap(config))
    .then(app => {
        Logger.info('Vendure server started successfully');
        Logger.info('Chat UI available at: http://localhost:3000/chat');
        Logger.info('Admin UI available at: http://localhost:3002/admin');
    })
    .catch(err => {
        console.log(err);
    });
