/**
 * Create a new user and log them in.
 *
 * @param {Object} attributes
 *
 * @example cy.login();
 *          cy.login({ name: 'JohnDoe' });
 */
Cypress.Commands.add('login', (attributes = {}) => {
    return cy
        .csrfToken()
        .then((token) => {
            return cy.request({
                method: 'POST',
                url: '/__cypress__/login',
                body: { attributes, _token: token },
                log: false,
            });
        })
        .then(({ body }) => {
            Cypress.log({
                name: 'login',
                message: attributes,
                consoleProps: () => ({ user: body }),
            });
        })
        .its('body', { log: false });
});

/**
 * Logout the current user.
 *
 * @example cy.logout();
 */
Cypress.Commands.add('logout', () => {
    return cy
        .csrfToken()
        .then((token) => {
            return cy.request({
                method: 'POST',
                url: '/__cypress__/logout',
                body: { _token: token },
                log: false,
            });
        })
        .then(() => {
            Cypress.log({ name: 'logout', message: '' });
        });
});

/**
 * Fetch a CSRF token.
 *
 * @example cy.csrfToken();
 */
Cypress.Commands.add('csrfToken', () => {
    return cy
        .request({
            method: 'GET',
            url: '/__cypress__/csrf_token',
            log: false,
        })
        .its('body', { log: false });
});

/**
 * Fetch and store all named routes.
 *
 * @example cy.refreshRoutes();
 */
Cypress.Commands.add('refreshRoutes', () => {
    return cy.csrfToken().then((token) => {
        return cy
            .request({
                method: 'POST',
                url: '/__cypress__/routes',
                body: { _token: token },
                log: false,
            })
            .its('body', { log: false })
            .then((routes) => {
                cy.writeFile('cypress/support/routes.json', routes, {
                    log: false,
                });

                Cypress.Laravel.routes = routes;
            });
    });
});

/**
 * Visit the given URL or route.
 *
 * @example cy.visit('foo/path');
 *          cy.visit({ route: 'home' });
 *          cy.visit({ route: 'team', parameters: { team: 1 } });
 */
Cypress.Commands.overwrite('visit', (originalFn, subject, options) => {
    if (subject.route) {
        return originalFn({
            url: Cypress.Laravel.route(subject.route, subject.parameters || {}),
            method: Cypress.Laravel.routes[subject.route].method[0],
        });
    }

    return originalFn(subject, options);
});

/**
 * Create a new Eloquent factory.
 *
 * @param {String} model
 * @param {Number|null} times
 * @param {Object|null} attributes
 * @param {Boolean|null} makeOnly
 *
 * @example cy.create('App\\User');
 *          cy.create('App\\User', 2);
 *          cy.create('App\\User', 2, { active: false });
 */
Cypress.Commands.add('create', (model, times = 1, attributes = {}, makeOnly = false) => {
    if (typeof attributes === "boolean") {
        makeOnly = attributes
    }
    if (typeof times === 'object') {
        attributes = times;
        times = 1;
    }

    return cy
        .csrfToken()
        .then((token) => {
            return cy.request({
                method: 'POST',
                url: '/__cypress__/factory',
                body: { attributes, model, times, _token: token, makeOnly},
                log: false,
            });
        })
        .then((response) => {
            Cypress.log({
                name: makeOnly ? 'make' : 'create',
                message: model + (times ? `(${times} times)` : ''),
                consoleProps: () => ({ [model]: response.body }),
            });
        })
        .its('body', { log: false });
});

/**
 * Create a new Eloquent factory.
 *
 * @param {String} model
 * @param {Number|null} times
 * @param {Object} attributes
 *
 * @example cy.make('App\\User');
 *          cy.make('App\\User', 2);
 *          cy.make('App\\User', 2, { active: false });
 */
Cypress.Commands.add('make', (model, times = 1, attributes = {}) => {
    return cy.create(model, times, attributes, true)
})

/**
 * Retrieve the email verification URL for a User.
 *
 * @param {Object} attributes that finds a User
 *
 * @example cy.emailVerificationUrl({ email: user@example.org });
 */
Cypress.Commands.add('emailVerificationUrl', (attributes) => {
    return cy
        .csrfToken()
        .then((token) => {
            return cy.request({
                method: 'POST',
                url: '/__cypress__/email_verification_url',
                body: { attributes, _token: token },
                log: false,
            });
        })
        .then((response) => {
            Cypress.log({
                name: 'verify url',
                message: response.body,
                consoleProps: () => ({ url: response.body }),
            });
        })
        .its('body', { log: false });
});

/**
 * Refresh the database state.
 *
 * @param {Object} options
 *
 * @example cy.refreshDatabase();
 *          cy.refreshDatabase({ '--drop-views': true });
 */
Cypress.Commands.add('refreshDatabase', (options = {}) => {
    return cy.artisan('migrate:fresh', options);
});

/**
 * Seed the database.
 *
 * @param {String} seederClass
 *
 * @example cy.seed();
 *          cy.seed('PlansTableSeeder');
 */
Cypress.Commands.add('seed', (seederClass) => {
    return cy.artisan('db:seed', {
        '--class': seederClass,
    });
});

/**
 * Trigger an Artisan command.
 *
 * @param {String} command
 * @param {Object} parameters
 * @param {Object} options
 *
 * @example cy.artisan('cache:clear');
 */
Cypress.Commands.add('artisan', (command, parameters = {}, options = {}) => {
    options = Object.assign({}, { log: true }, options);

    if (options.log) {
        Cypress.log({
            name: 'artisan',
            message: command,
            consoleProps: () => ({ command, parameters }),
        });
    }

    return cy.csrfToken().then((token) => {
        return cy.request({
            method: 'POST',
            url: '/__cypress__/artisan',
            body: { command: command, parameters: parameters, _token: token },
            log: false,
        });
    });
});

/**
 * Execute arbitrary PHP.
 *
 * @param {String} command
 *
 * @example cy.php('2 + 2');
 *          cy.php('App\\User::count()');
 */
Cypress.Commands.add('php', (command) => {
    return cy
        .csrfToken()
        .then((token) => {
            return cy.request({
                method: 'POST',
                url: '/__cypress__/run-php',
                body: { command: command, _token: token },
                log: false,
            });
        })
        .then((response) => {
            Cypress.log({
                name: 'php',
                message: command,
                consoleProps: () => ({ result: response.body.result }),
            });
        })
        .its('body.result', { log: false });
});
