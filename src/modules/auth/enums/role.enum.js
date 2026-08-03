"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
var graphql_1 = require("@nestjs/graphql");
var Role;
(function (Role) {
    Role["SUPER"] = "super";
    Role["ADMIN"] = "admin";
    Role["MANAGER"] = "manager";
    Role["USER"] = "user";
})(Role || (exports.Role = Role = {}));
(0, graphql_1.registerEnumType)(Role, {
    name: 'Role',
    description: 'User roles used for authorization',
});
