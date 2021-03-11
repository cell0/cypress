Cypress.Commands.add('assertLocation', path => {
    if (path.route) {
        path = Cypress.Laravel.route(path.route, path.parameters || {})
    }
    cy.location('pathname').should('eq', `/${path}`.replace(/^\/\//, '/'));
});
