'use strict';

const path = require('path');
const read = require('@iondv/commons/lib/config-reader');
const { readConfig } = require('@iondv/core/utils/read');
const config = readConfig(path.join(__dirname, './config.json'));
const { backend: { api } } = require('@iondv/web');

module.exports = {
  ...read(config, __dirname),
  onStart: (app) => {
  },
  dispatcher: (app) => {
    app.get('/api/notifications', api.notifications);
    app.post('/api/notifications/viewed/:id', api.markAsViewed);
    app.post('/api/notifications/viewed-all', api.markAllAsViewed);
    app.get('/api/notifications/viewed-more/:offset', api.moreViewedNotifications);
    app.get('/i18n/handler.js', api.i18n);
  },
  modules: {
    registry: require('@iondv/registry'),
    rest: require('@iondv/rest'),
    ionadmin: require('@iondv/ionadmin'),
    dashboard: require('@iondv/dashboard')
  },
  applications: {
    viewlib: require('@iondv/viewlib')
  }
};

