"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserDto = void 0;
var class_validator_1 = require("class-validator");
var strongpassword_decorator_1 = require("../../auth/decorators/strongpassword.decorator");
var graphql_1 = require("@nestjs/graphql");
var swagger_1 = require("@nestjs/swagger");
var role_enum_1 = require("../../auth/enums/role.enum");
var UpdateUserDto = function () {
    var _classDecorators = [(0, graphql_1.InputType)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _firstName_decorators;
    var _firstName_initializers = [];
    var _firstName_extraInitializers = [];
    var _lastName_decorators;
    var _lastName_initializers = [];
    var _lastName_extraInitializers = [];
    var _username_decorators;
    var _username_initializers = [];
    var _username_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _isActive_decorators;
    var _isActive_initializers = [];
    var _isActive_extraInitializers = [];
    var _roles_decorators;
    var _roles_initializers = [];
    var _roles_extraInitializers = [];
    var _googleId_decorators;
    var _googleId_initializers = [];
    var _googleId_extraInitializers = [];
    var _facebookId_decorators;
    var _facebookId_initializers = [];
    var _facebookId_extraInitializers = [];
    var _twitterId_decorators;
    var _twitterId_initializers = [];
    var _twitterId_extraInitializers = [];
    var _githubId_decorators;
    var _githubId_initializers = [];
    var _githubId_extraInitializers = [];
    var _figmaId_decorators;
    var _figmaId_initializers = [];
    var _figmaId_extraInitializers = [];
    var _linkedinId_decorators;
    var _linkedinId_initializers = [];
    var _linkedinId_extraInitializers = [];
    var _slackId_decorators;
    var _slackId_initializers = [];
    var _slackId_extraInitializers = [];
    var _atlassianId_decorators;
    var _atlassianId_initializers = [];
    var _atlassianId_extraInitializers = [];
    var _gitlabId_decorators;
    var _gitlabId_initializers = [];
    var _gitlabId_extraInitializers = [];
    var _bitbucketId_decorators;
    var _bitbucketId_initializers = [];
    var _bitbucketId_extraInitializers = [];
    var _discordId_decorators;
    var _discordId_initializers = [];
    var _discordId_extraInitializers = [];
    var _twitchId_decorators;
    var _twitchId_initializers = [];
    var _twitchId_extraInitializers = [];
    var _steamId_decorators;
    var _steamId_initializers = [];
    var _steamId_extraInitializers = [];
    var _redditId_decorators;
    var _redditId_initializers = [];
    var _redditId_extraInitializers = [];
    var _amazonId_decorators;
    var _amazonId_initializers = [];
    var _amazonId_extraInitializers = [];
    var _patreonId_decorators;
    var _patreonId_initializers = [];
    var _patreonId_extraInitializers = [];
    var _dropboxId_decorators;
    var _dropboxId_initializers = [];
    var _dropboxId_extraInitializers = [];
    var _metamaskId_decorators;
    var _metamaskId_initializers = [];
    var _metamaskId_extraInitializers = [];
    var _activeDirectoryId_decorators;
    var _activeDirectoryId_initializers = [];
    var _activeDirectoryId_extraInitializers = [];
    var _appleId_decorators;
    var _appleId_initializers = [];
    var _appleId_extraInitializers = [];
    var _emailVerificationToken_decorators;
    var _emailVerificationToken_initializers = [];
    var _emailVerificationToken_extraInitializers = [];
    var _emailVerificationExpires_decorators;
    var _emailVerificationExpires_initializers = [];
    var _emailVerificationExpires_extraInitializers = [];
    var UpdateUserDto = _classThis = /** @class */ (function () {
        function UpdateUserDto_1() {
            this.firstName = __runInitializers(this, _firstName_initializers, void 0);
            this.lastName = (__runInitializers(this, _firstName_extraInitializers), __runInitializers(this, _lastName_initializers, void 0));
            this.username = (__runInitializers(this, _lastName_extraInitializers), __runInitializers(this, _username_initializers, void 0));
            this.email = (__runInitializers(this, _username_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.password = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _password_initializers, void 0));
            this.isActive = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.roles = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _roles_initializers, void 0));
            this.googleId = (__runInitializers(this, _roles_extraInitializers), __runInitializers(this, _googleId_initializers, void 0));
            this.facebookId = (__runInitializers(this, _googleId_extraInitializers), __runInitializers(this, _facebookId_initializers, void 0));
            this.twitterId = (__runInitializers(this, _facebookId_extraInitializers), __runInitializers(this, _twitterId_initializers, void 0));
            this.githubId = (__runInitializers(this, _twitterId_extraInitializers), __runInitializers(this, _githubId_initializers, void 0));
            this.figmaId = (__runInitializers(this, _githubId_extraInitializers), __runInitializers(this, _figmaId_initializers, void 0));
            this.linkedinId = (__runInitializers(this, _figmaId_extraInitializers), __runInitializers(this, _linkedinId_initializers, void 0));
            this.slackId = (__runInitializers(this, _linkedinId_extraInitializers), __runInitializers(this, _slackId_initializers, void 0));
            this.atlassianId = (__runInitializers(this, _slackId_extraInitializers), __runInitializers(this, _atlassianId_initializers, void 0));
            this.gitlabId = (__runInitializers(this, _atlassianId_extraInitializers), __runInitializers(this, _gitlabId_initializers, void 0));
            this.bitbucketId = (__runInitializers(this, _gitlabId_extraInitializers), __runInitializers(this, _bitbucketId_initializers, void 0));
            this.discordId = (__runInitializers(this, _bitbucketId_extraInitializers), __runInitializers(this, _discordId_initializers, void 0));
            this.twitchId = (__runInitializers(this, _discordId_extraInitializers), __runInitializers(this, _twitchId_initializers, void 0));
            this.steamId = (__runInitializers(this, _twitchId_extraInitializers), __runInitializers(this, _steamId_initializers, void 0));
            this.redditId = (__runInitializers(this, _steamId_extraInitializers), __runInitializers(this, _redditId_initializers, void 0));
            this.amazonId = (__runInitializers(this, _redditId_extraInitializers), __runInitializers(this, _amazonId_initializers, void 0));
            this.patreonId = (__runInitializers(this, _amazonId_extraInitializers), __runInitializers(this, _patreonId_initializers, void 0));
            this.dropboxId = (__runInitializers(this, _patreonId_extraInitializers), __runInitializers(this, _dropboxId_initializers, void 0));
            this.metamaskId = (__runInitializers(this, _dropboxId_extraInitializers), __runInitializers(this, _metamaskId_initializers, void 0));
            this.activeDirectoryId = (__runInitializers(this, _metamaskId_extraInitializers), __runInitializers(this, _activeDirectoryId_initializers, void 0));
            this.appleId = (__runInitializers(this, _activeDirectoryId_extraInitializers), __runInitializers(this, _appleId_initializers, void 0));
            this.emailVerificationToken = (__runInitializers(this, _appleId_extraInitializers), __runInitializers(this, _emailVerificationToken_initializers, void 0));
            this.emailVerificationExpires = (__runInitializers(this, _emailVerificationToken_extraInitializers), __runInitializers(this, _emailVerificationExpires_initializers, void 0));
            __runInitializers(this, _emailVerificationExpires_extraInitializers);
        }
        return UpdateUserDto_1;
    }());
    __setFunctionName(_classThis, "UpdateUserDto");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _firstName_decorators = [(0, swagger_1.ApiPropertyOptional)({ example: 'Jane', description: 'User first name' }), (0, graphql_1.Field)({ nullable: true }), (0, class_validator_1.IsString)({ message: 'First name must be a string' }), (0, class_validator_1.IsOptional)()];
        _lastName_decorators = [(0, swagger_1.ApiPropertyOptional)({ example: 'Smith', description: 'User last name' }), (0, graphql_1.Field)({ nullable: true }), (0, class_validator_1.IsString)({ message: 'Last name must be a string' }), (0, class_validator_1.IsOptional)()];
        _username_decorators = [(0, swagger_1.ApiPropertyOptional)({ example: 'janesmith', description: 'Unique username' }), (0, graphql_1.Field)({ nullable: true }), (0, class_validator_1.IsString)({ message: 'Username must be a string' }), (0, class_validator_1.IsOptional)()];
        _email_decorators = [(0, swagger_1.ApiPropertyOptional)({ example: 'jane.smith@example.com', description: 'User email address' }), (0, graphql_1.Field)({ nullable: true }), (0, class_validator_1.IsEmail)({}, { message: 'Invalid email address' }), (0, class_validator_1.IsOptional)()];
        _password_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'Str0ng!P@ssword',
                description: 'Password (uppercase, lowercase, number, and special character)',
            }), (0, graphql_1.Field)({ nullable: true }), (0, strongpassword_decorator_1.StrongPassword)({ message: 'Invalid password format' }), (0, class_validator_1.IsOptional)()];
        _isActive_decorators = [(0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Whether the user account is active' }), (0, graphql_1.Field)({ nullable: true }), (0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
        _roles_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: [role_enum_1.Role.USER, role_enum_1.Role.MANAGER],
                enum: role_enum_1.Role,
                isArray: true,
                description: 'Roles assigned to the user',
            }), (0, graphql_1.Field)(function () { return [role_enum_1.Role]; }, { nullable: true }), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsEnum)(role_enum_1.Role, { each: true, message: 'Each role must be a valid Role enum value' }), (0, class_validator_1.IsOptional)()];
        _googleId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '108234567890123456789',
                description: 'Google subject ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _facebookId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '10234567890123456',
                description: 'Facebook subject ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _twitterId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '2244994945',
                description: 'X / Twitter subject ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _githubId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '12345678',
                description: 'GitHub subject ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _figmaId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '1234567890123456789',
                description: 'Figma subject ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _linkedinId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'AbCdEfGhIjKlMnOp',
                description: 'LinkedIn OpenID subject (sub) for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _slackId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'U0R7JM',
                description: 'Slack OpenID subject (sub) for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _atlassianId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '112233aa-bb11-cc22-33dd-445566abcabc',
                description: 'Atlassian account_id for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _gitlabId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '12345678',
                description: 'GitLab user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _bitbucketId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}',
                description: 'Bitbucket user UUID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _discordId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '123456789012345678',
                description: 'Discord snowflake user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _twitchId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '141981764',
                description: 'Twitch user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _steamId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '76561198000000000',
                description: 'SteamID64 for OpenID users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _redditId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'abc123',
                description: 'Reddit user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _amazonId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'amzn1.account.abc123',
                description: 'Amazon user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _patreonId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'patreon-user-123',
                description: 'Patreon user ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _dropboxId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
                description: 'Dropbox account ID for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _metamaskId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                description: 'Ethereum address (lowercase) for MetaMask SIWE users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _activeDirectoryId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'a1b2c3d4e5f6789012345678abcdef01',
                description: 'Active Directory objectGUID for LDAP users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _appleId_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'apple.sub.001',
                description: 'Apple subject ID (sub from id_token) for OAuth users',
            }), (0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
        _emailVerificationToken_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: 'abc123def456...',
                description: 'Email verification token (internal/admin use)',
            }), (0, class_validator_1.IsString)({ message: 'E-mail verification token must be a string' }), (0, class_validator_1.IsOptional)()];
        _emailVerificationExpires_decorators = [(0, swagger_1.ApiPropertyOptional)({
                example: '2026-12-31T23:59:59.000Z',
                description: 'Email verification token expiration (internal/admin use)',
            }), (0, class_validator_1.IsDate)({ message: 'E-mail verification expiration must be a date' }), (0, class_validator_1.IsOptional)()];
        __esDecorate(null, null, _firstName_decorators, { kind: "field", name: "firstName", static: false, private: false, access: { has: function (obj) { return "firstName" in obj; }, get: function (obj) { return obj.firstName; }, set: function (obj, value) { obj.firstName = value; } }, metadata: _metadata }, _firstName_initializers, _firstName_extraInitializers);
        __esDecorate(null, null, _lastName_decorators, { kind: "field", name: "lastName", static: false, private: false, access: { has: function (obj) { return "lastName" in obj; }, get: function (obj) { return obj.lastName; }, set: function (obj, value) { obj.lastName = value; } }, metadata: _metadata }, _lastName_initializers, _lastName_extraInitializers);
        __esDecorate(null, null, _username_decorators, { kind: "field", name: "username", static: false, private: false, access: { has: function (obj) { return "username" in obj; }, get: function (obj) { return obj.username; }, set: function (obj, value) { obj.username = value; } }, metadata: _metadata }, _username_initializers, _username_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: function (obj) { return "isActive" in obj; }, get: function (obj) { return obj.isActive; }, set: function (obj, value) { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _roles_decorators, { kind: "field", name: "roles", static: false, private: false, access: { has: function (obj) { return "roles" in obj; }, get: function (obj) { return obj.roles; }, set: function (obj, value) { obj.roles = value; } }, metadata: _metadata }, _roles_initializers, _roles_extraInitializers);
        __esDecorate(null, null, _googleId_decorators, { kind: "field", name: "googleId", static: false, private: false, access: { has: function (obj) { return "googleId" in obj; }, get: function (obj) { return obj.googleId; }, set: function (obj, value) { obj.googleId = value; } }, metadata: _metadata }, _googleId_initializers, _googleId_extraInitializers);
        __esDecorate(null, null, _facebookId_decorators, { kind: "field", name: "facebookId", static: false, private: false, access: { has: function (obj) { return "facebookId" in obj; }, get: function (obj) { return obj.facebookId; }, set: function (obj, value) { obj.facebookId = value; } }, metadata: _metadata }, _facebookId_initializers, _facebookId_extraInitializers);
        __esDecorate(null, null, _twitterId_decorators, { kind: "field", name: "twitterId", static: false, private: false, access: { has: function (obj) { return "twitterId" in obj; }, get: function (obj) { return obj.twitterId; }, set: function (obj, value) { obj.twitterId = value; } }, metadata: _metadata }, _twitterId_initializers, _twitterId_extraInitializers);
        __esDecorate(null, null, _githubId_decorators, { kind: "field", name: "githubId", static: false, private: false, access: { has: function (obj) { return "githubId" in obj; }, get: function (obj) { return obj.githubId; }, set: function (obj, value) { obj.githubId = value; } }, metadata: _metadata }, _githubId_initializers, _githubId_extraInitializers);
        __esDecorate(null, null, _figmaId_decorators, { kind: "field", name: "figmaId", static: false, private: false, access: { has: function (obj) { return "figmaId" in obj; }, get: function (obj) { return obj.figmaId; }, set: function (obj, value) { obj.figmaId = value; } }, metadata: _metadata }, _figmaId_initializers, _figmaId_extraInitializers);
        __esDecorate(null, null, _linkedinId_decorators, { kind: "field", name: "linkedinId", static: false, private: false, access: { has: function (obj) { return "linkedinId" in obj; }, get: function (obj) { return obj.linkedinId; }, set: function (obj, value) { obj.linkedinId = value; } }, metadata: _metadata }, _linkedinId_initializers, _linkedinId_extraInitializers);
        __esDecorate(null, null, _slackId_decorators, { kind: "field", name: "slackId", static: false, private: false, access: { has: function (obj) { return "slackId" in obj; }, get: function (obj) { return obj.slackId; }, set: function (obj, value) { obj.slackId = value; } }, metadata: _metadata }, _slackId_initializers, _slackId_extraInitializers);
        __esDecorate(null, null, _atlassianId_decorators, { kind: "field", name: "atlassianId", static: false, private: false, access: { has: function (obj) { return "atlassianId" in obj; }, get: function (obj) { return obj.atlassianId; }, set: function (obj, value) { obj.atlassianId = value; } }, metadata: _metadata }, _atlassianId_initializers, _atlassianId_extraInitializers);
        __esDecorate(null, null, _gitlabId_decorators, { kind: "field", name: "gitlabId", static: false, private: false, access: { has: function (obj) { return "gitlabId" in obj; }, get: function (obj) { return obj.gitlabId; }, set: function (obj, value) { obj.gitlabId = value; } }, metadata: _metadata }, _gitlabId_initializers, _gitlabId_extraInitializers);
        __esDecorate(null, null, _bitbucketId_decorators, { kind: "field", name: "bitbucketId", static: false, private: false, access: { has: function (obj) { return "bitbucketId" in obj; }, get: function (obj) { return obj.bitbucketId; }, set: function (obj, value) { obj.bitbucketId = value; } }, metadata: _metadata }, _bitbucketId_initializers, _bitbucketId_extraInitializers);
        __esDecorate(null, null, _discordId_decorators, { kind: "field", name: "discordId", static: false, private: false, access: { has: function (obj) { return "discordId" in obj; }, get: function (obj) { return obj.discordId; }, set: function (obj, value) { obj.discordId = value; } }, metadata: _metadata }, _discordId_initializers, _discordId_extraInitializers);
        __esDecorate(null, null, _twitchId_decorators, { kind: "field", name: "twitchId", static: false, private: false, access: { has: function (obj) { return "twitchId" in obj; }, get: function (obj) { return obj.twitchId; }, set: function (obj, value) { obj.twitchId = value; } }, metadata: _metadata }, _twitchId_initializers, _twitchId_extraInitializers);
        __esDecorate(null, null, _steamId_decorators, { kind: "field", name: "steamId", static: false, private: false, access: { has: function (obj) { return "steamId" in obj; }, get: function (obj) { return obj.steamId; }, set: function (obj, value) { obj.steamId = value; } }, metadata: _metadata }, _steamId_initializers, _steamId_extraInitializers);
        __esDecorate(null, null, _redditId_decorators, { kind: "field", name: "redditId", static: false, private: false, access: { has: function (obj) { return "redditId" in obj; }, get: function (obj) { return obj.redditId; }, set: function (obj, value) { obj.redditId = value; } }, metadata: _metadata }, _redditId_initializers, _redditId_extraInitializers);
        __esDecorate(null, null, _amazonId_decorators, { kind: "field", name: "amazonId", static: false, private: false, access: { has: function (obj) { return "amazonId" in obj; }, get: function (obj) { return obj.amazonId; }, set: function (obj, value) { obj.amazonId = value; } }, metadata: _metadata }, _amazonId_initializers, _amazonId_extraInitializers);
        __esDecorate(null, null, _patreonId_decorators, { kind: "field", name: "patreonId", static: false, private: false, access: { has: function (obj) { return "patreonId" in obj; }, get: function (obj) { return obj.patreonId; }, set: function (obj, value) { obj.patreonId = value; } }, metadata: _metadata }, _patreonId_initializers, _patreonId_extraInitializers);
        __esDecorate(null, null, _dropboxId_decorators, { kind: "field", name: "dropboxId", static: false, private: false, access: { has: function (obj) { return "dropboxId" in obj; }, get: function (obj) { return obj.dropboxId; }, set: function (obj, value) { obj.dropboxId = value; } }, metadata: _metadata }, _dropboxId_initializers, _dropboxId_extraInitializers);
        __esDecorate(null, null, _metamaskId_decorators, { kind: "field", name: "metamaskId", static: false, private: false, access: { has: function (obj) { return "metamaskId" in obj; }, get: function (obj) { return obj.metamaskId; }, set: function (obj, value) { obj.metamaskId = value; } }, metadata: _metadata }, _metamaskId_initializers, _metamaskId_extraInitializers);
        __esDecorate(null, null, _activeDirectoryId_decorators, { kind: "field", name: "activeDirectoryId", static: false, private: false, access: { has: function (obj) { return "activeDirectoryId" in obj; }, get: function (obj) { return obj.activeDirectoryId; }, set: function (obj, value) { obj.activeDirectoryId = value; } }, metadata: _metadata }, _activeDirectoryId_initializers, _activeDirectoryId_extraInitializers);
        __esDecorate(null, null, _appleId_decorators, { kind: "field", name: "appleId", static: false, private: false, access: { has: function (obj) { return "appleId" in obj; }, get: function (obj) { return obj.appleId; }, set: function (obj, value) { obj.appleId = value; } }, metadata: _metadata }, _appleId_initializers, _appleId_extraInitializers);
        __esDecorate(null, null, _emailVerificationToken_decorators, { kind: "field", name: "emailVerificationToken", static: false, private: false, access: { has: function (obj) { return "emailVerificationToken" in obj; }, get: function (obj) { return obj.emailVerificationToken; }, set: function (obj, value) { obj.emailVerificationToken = value; } }, metadata: _metadata }, _emailVerificationToken_initializers, _emailVerificationToken_extraInitializers);
        __esDecorate(null, null, _emailVerificationExpires_decorators, { kind: "field", name: "emailVerificationExpires", static: false, private: false, access: { has: function (obj) { return "emailVerificationExpires" in obj; }, get: function (obj) { return obj.emailVerificationExpires; }, set: function (obj, value) { obj.emailVerificationExpires = value; } }, metadata: _metadata }, _emailVerificationExpires_initializers, _emailVerificationExpires_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UpdateUserDto = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UpdateUserDto = _classThis;
}();
exports.UpdateUserDto = UpdateUserDto;
