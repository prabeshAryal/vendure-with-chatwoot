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
