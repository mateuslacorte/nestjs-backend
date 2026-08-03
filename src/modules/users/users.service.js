"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
var common_1 = require("@nestjs/common");
var cache_decorator_1 = require("@common/cache/decorators/cache.decorator");
var UsersService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _create_decorators;
    var _findAll_decorators;
    var _findById_decorators;
    var _findByEmail_decorators;
    var _findByUsername_decorators;
    var _findByGoogleId_decorators;
    var _findByFacebookId_decorators;
    var _findByTwitterId_decorators;
    var _findByGithubId_decorators;
    var _findByFigmaId_decorators;
    var _findByLinkedinId_decorators;
    var _findBySlackId_decorators;
    var _findByAtlassianId_decorators;
    var _findByGitlabId_decorators;
    var _findByBitbucketId_decorators;
    var _findByDiscordId_decorators;
    var _findByTwitchId_decorators;
    var _findBySteamId_decorators;
    var _findByRedditId_decorators;
    var _findBySpotifyId_decorators;
    var _findByAmazonId_decorators;
    var _findByMicrosoftId_decorators;
    var _findByPatreonId_decorators;
    var _findByDropboxId_decorators;
    var _findByCoinbaseId_decorators;
    var _findByMetamaskId_decorators;
    var _findByActiveDirectoryId_decorators;
    var _findByAppleId_decorators;
    var _findByEmailVerificationToken_decorators;
    var _findByPasswordToken_decorators;
    var _update_decorators;
    var _remove_decorators;
    var UsersService = _classThis = /** @class */ (function () {
        function UsersService_1(postgresRepo) {
            this.postgresRepo = (__runInitializers(this, _instanceExtraInitializers), postgresRepo);
        }
        /**
         * Create a new user
         * @param userData - User data to create
         * @returns The created user
         */
        UsersService_1.prototype.create = function (userData) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.create(userData, true)];
                });
            });
        };
        /**
         * Find all users
         * @returns List of users or null if none found
         */
        UsersService_1.prototype.findAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findAll()];
                });
            });
        };
        /**
         * Find a user by ID
         * @param id - User ID
         * @param includePassword - Whether to return the password hash
         * @returns The user or null if not found
         */
        UsersService_1.prototype.findById = function (id_1) {
            return __awaiter(this, arguments, void 0, function (id, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findById(id, includePassword)];
                });
            });
        };
        /**
         * Find a user by email
         * @param email - User's email
         * @param includePassword - Whether to return the password hash
         * @returns The user or null if not found
         */
        UsersService_1.prototype.findByEmail = function (email_1) {
            return __awaiter(this, arguments, void 0, function (email, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByEmail(email, includePassword)];
                });
            });
        };
        UsersService_1.prototype.findByUsername = function (username) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByUsername(username)];
                });
            });
        };
        /**
         * Find a user by Google subject ID
         */
        UsersService_1.prototype.findByGoogleId = function (googleId_1) {
            return __awaiter(this, arguments, void 0, function (googleId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByGoogleId(googleId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Facebook subject ID
         */
        UsersService_1.prototype.findByFacebookId = function (facebookId_1) {
            return __awaiter(this, arguments, void 0, function (facebookId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByFacebookId(facebookId, includePassword)];
                });
            });
        };
        /**
         * Find a user by X / Twitter subject ID
         */
        UsersService_1.prototype.findByTwitterId = function (twitterId_1) {
            return __awaiter(this, arguments, void 0, function (twitterId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByTwitterId(twitterId, includePassword)];
                });
            });
        };
        /**
         * Find a user by GitHub subject ID
         */
        UsersService_1.prototype.findByGithubId = function (githubId_1) {
            return __awaiter(this, arguments, void 0, function (githubId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByGithubId(githubId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Figma subject ID
         */
        UsersService_1.prototype.findByFigmaId = function (figmaId_1) {
            return __awaiter(this, arguments, void 0, function (figmaId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByFigmaId(figmaId, includePassword)];
                });
            });
        };
        /**
         * Find a user by LinkedIn OpenID subject ID
         */
        UsersService_1.prototype.findByLinkedinId = function (linkedinId_1) {
            return __awaiter(this, arguments, void 0, function (linkedinId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByLinkedinId(linkedinId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Slack OpenID subject ID
         */
        UsersService_1.prototype.findBySlackId = function (slackId_1) {
            return __awaiter(this, arguments, void 0, function (slackId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findBySlackId(slackId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Atlassian account ID
         */
        UsersService_1.prototype.findByAtlassianId = function (atlassianId_1) {
            return __awaiter(this, arguments, void 0, function (atlassianId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByAtlassianId(atlassianId, includePassword)];
                });
            });
        };
        /**
         * Find a user by GitLab user ID
         */
        UsersService_1.prototype.findByGitlabId = function (gitlabId_1) {
            return __awaiter(this, arguments, void 0, function (gitlabId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByGitlabId(gitlabId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Bitbucket user UUID
         */
        UsersService_1.prototype.findByBitbucketId = function (bitbucketId_1) {
            return __awaiter(this, arguments, void 0, function (bitbucketId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByBitbucketId(bitbucketId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Discord snowflake user ID
         */
        UsersService_1.prototype.findByDiscordId = function (discordId_1) {
            return __awaiter(this, arguments, void 0, function (discordId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByDiscordId(discordId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Twitch user ID
         */
        UsersService_1.prototype.findByTwitchId = function (twitchId_1) {
            return __awaiter(this, arguments, void 0, function (twitchId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByTwitchId(twitchId, includePassword)];
                });
            });
        };
        /**
         * Find a user by SteamID64
         */
        UsersService_1.prototype.findBySteamId = function (steamId_1) {
            return __awaiter(this, arguments, void 0, function (steamId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findBySteamId(steamId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Reddit user ID
         */
        UsersService_1.prototype.findByRedditId = function (redditId_1) {
            return __awaiter(this, arguments, void 0, function (redditId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByRedditId(redditId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Spotify user ID
         */
        UsersService_1.prototype.findBySpotifyId = function (spotifyId_1) {
            return __awaiter(this, arguments, void 0, function (spotifyId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findBySpotifyId(spotifyId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Amazon user ID
         */
        UsersService_1.prototype.findByAmazonId = function (amazonId_1) {
            return __awaiter(this, arguments, void 0, function (amazonId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByAmazonId(amazonId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Microsoft Entra ID object ID
         */
        UsersService_1.prototype.findByMicrosoftId = function (microsoftId_1) {
            return __awaiter(this, arguments, void 0, function (microsoftId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByMicrosoftId(microsoftId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Patreon user ID
         */
        UsersService_1.prototype.findByPatreonId = function (patreonId_1) {
            return __awaiter(this, arguments, void 0, function (patreonId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByPatreonId(patreonId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Dropbox account ID
         */
        UsersService_1.prototype.findByDropboxId = function (dropboxId_1) {
            return __awaiter(this, arguments, void 0, function (dropboxId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByDropboxId(dropboxId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Coinbase user ID
         */
        UsersService_1.prototype.findByCoinbaseId = function (coinbaseId_1) {
            return __awaiter(this, arguments, void 0, function (coinbaseId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByCoinbaseId(coinbaseId, includePassword)];
                });
            });
        };
        /**
         * Find a user by MetaMask Ethereum address
         */
        UsersService_1.prototype.findByMetamaskId = function (metamaskId_1) {
            return __awaiter(this, arguments, void 0, function (metamaskId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByMetamaskId(metamaskId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Active Directory objectGUID
         */
        UsersService_1.prototype.findByActiveDirectoryId = function (activeDirectoryId_1) {
            return __awaiter(this, arguments, void 0, function (activeDirectoryId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByActiveDirectoryId(activeDirectoryId, includePassword)];
                });
            });
        };
        /**
         * Find a user by Apple subject ID
         */
        UsersService_1.prototype.findByAppleId = function (appleId_1) {
            return __awaiter(this, arguments, void 0, function (appleId, includePassword) {
                if (includePassword === void 0) { includePassword = false; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByAppleId(appleId, includePassword)];
                });
            });
        };
        /**
         * Find a user by email verification token
         * @param token - User's email verification token
         * @returns The user or null if not found
         */
        UsersService_1.prototype.findByEmailVerificationToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByEmailVerificationToken(token)];
                });
            });
        };
        /**
         * Find a user by password reset token
         * @param token - User's password reset token
         * @returns The user or null if not found
         */
        UsersService_1.prototype.findByPasswordToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.findByPasswordToken(token)];
                });
            });
        };
        /**
         * Update a user by ID
         * @param id - User's ID
         * @returns The updated user
         */
        UsersService_1.prototype.update = function (id, updateUserDto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.update(id, updateUserDto)];
                });
            });
        };
        /**
         * Remove a user by ID
         * @param id
         * @returns The removed user
         */
        UsersService_1.prototype.remove = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.remove(id)];
                });
            });
        };
        /**
         * Update the user's password reset token and expiration
         * @param userId
         * @param resetData
         */
        UsersService_1.prototype.updateResetToken = function (userId, resetData) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postgresRepo.update(userId, resetData)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Update the user's password
         * @param userId
         * @param passwordData
         */
        UsersService_1.prototype.updatePassword = function (userId, passwordData) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postgresRepo.update(userId, passwordData, false)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Update user roles
         * @param userId - User's ID
         * @param roles - New roles array
         * @returns The updated user
         */
        UsersService_1.prototype.updateRoles = function (userId, roles) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.postgresRepo.update(userId, { roles: roles })];
                });
            });
        };
        /**
         * Add a role to the user if not already present
         * @param userId - User's ID
         * @param role - Role to add
         * @returns The updated user
         */
        UsersService_1.prototype.addRole = function (userId, role) {
            return __awaiter(this, void 0, void 0, function () {
                var user, newRoles;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postgresRepo.findById(userId)];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new Error("User with ID ".concat(userId, " not found"));
                            }
                            if (!user.roles.includes(role)) {
                                newRoles = __spreadArray(__spreadArray([], user.roles, true), [role], false);
                                return [2 /*return*/, this.updateRoles(userId, newRoles)];
                            }
                            return [2 /*return*/, user];
                    }
                });
            });
        };
        /**
         * Remove a role from the user
         * @param userId - User's ID
         * @param role - Role to remove
         * @returns The updated user
         */
        UsersService_1.prototype.removeRole = function (userId, role) {
            return __awaiter(this, void 0, void 0, function () {
                var user, newRoles;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postgresRepo.findById(userId)];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new Error("User with ID ".concat(userId, " not found"));
                            }
                            newRoles = user.roles.filter(function (r) { return r !== role; });
                            return [2 /*return*/, this.updateRoles(userId, newRoles)];
                    }
                });
            });
        };
        /**
         * Replace one role with another
         * @param userId - User's ID
         * @param oldRole - Role to replace
         * @param newRole - New role
         * @returns The updated user
         */
        UsersService_1.prototype.replaceRole = function (userId, oldRole, newRole) {
            return __awaiter(this, void 0, void 0, function () {
                var user, newRoles, uniqueRoles;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postgresRepo.findById(userId)];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new Error("User with ID ".concat(userId, " not found"));
                            }
                            newRoles = user.roles.map(function (r) { return r === oldRole ? newRole : r; });
                            uniqueRoles = __spreadArray([], new Set(newRoles), true);
                            return [2 /*return*/, this.updateRoles(userId, uniqueRoles)];
                    }
                });
            });
        };
        return UsersService_1;
    }());
    __setFunctionName(_classThis, "UsersService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, cache_decorator_1.EnableCache)(), (0, cache_decorator_1.CacheTTL)(1800)];
        _findAll_decorators = [(0, cache_decorator_1.EnableCache)(), (0, cache_decorator_1.CacheTTL)(1800)];
        _findById_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByEmail_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByUsername_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByGoogleId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByFacebookId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByTwitterId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByGithubId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByFigmaId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByLinkedinId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findBySlackId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByAtlassianId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByGitlabId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByBitbucketId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByDiscordId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByTwitchId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findBySteamId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByRedditId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findBySpotifyId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByAmazonId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByMicrosoftId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByPatreonId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByDropboxId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByCoinbaseId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByMetamaskId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByActiveDirectoryId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByAppleId_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByEmailVerificationToken_decorators = [(0, cache_decorator_1.NoCache)()];
        _findByPasswordToken_decorators = [(0, cache_decorator_1.NoCache)()];
        _update_decorators = [(0, cache_decorator_1.EnableCache)(), (0, cache_decorator_1.CacheTTL)(1800)];
        _remove_decorators = [(0, cache_decorator_1.EnableCache)(), (0, cache_decorator_1.CacheTTL)(1800)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findById_decorators, { kind: "method", name: "findById", static: false, private: false, access: { has: function (obj) { return "findById" in obj; }, get: function (obj) { return obj.findById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByEmail_decorators, { kind: "method", name: "findByEmail", static: false, private: false, access: { has: function (obj) { return "findByEmail" in obj; }, get: function (obj) { return obj.findByEmail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByUsername_decorators, { kind: "method", name: "findByUsername", static: false, private: false, access: { has: function (obj) { return "findByUsername" in obj; }, get: function (obj) { return obj.findByUsername; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByGoogleId_decorators, { kind: "method", name: "findByGoogleId", static: false, private: false, access: { has: function (obj) { return "findByGoogleId" in obj; }, get: function (obj) { return obj.findByGoogleId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByFacebookId_decorators, { kind: "method", name: "findByFacebookId", static: false, private: false, access: { has: function (obj) { return "findByFacebookId" in obj; }, get: function (obj) { return obj.findByFacebookId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByTwitterId_decorators, { kind: "method", name: "findByTwitterId", static: false, private: false, access: { has: function (obj) { return "findByTwitterId" in obj; }, get: function (obj) { return obj.findByTwitterId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByGithubId_decorators, { kind: "method", name: "findByGithubId", static: false, private: false, access: { has: function (obj) { return "findByGithubId" in obj; }, get: function (obj) { return obj.findByGithubId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByFigmaId_decorators, { kind: "method", name: "findByFigmaId", static: false, private: false, access: { has: function (obj) { return "findByFigmaId" in obj; }, get: function (obj) { return obj.findByFigmaId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByLinkedinId_decorators, { kind: "method", name: "findByLinkedinId", static: false, private: false, access: { has: function (obj) { return "findByLinkedinId" in obj; }, get: function (obj) { return obj.findByLinkedinId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findBySlackId_decorators, { kind: "method", name: "findBySlackId", static: false, private: false, access: { has: function (obj) { return "findBySlackId" in obj; }, get: function (obj) { return obj.findBySlackId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByAtlassianId_decorators, { kind: "method", name: "findByAtlassianId", static: false, private: false, access: { has: function (obj) { return "findByAtlassianId" in obj; }, get: function (obj) { return obj.findByAtlassianId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByGitlabId_decorators, { kind: "method", name: "findByGitlabId", static: false, private: false, access: { has: function (obj) { return "findByGitlabId" in obj; }, get: function (obj) { return obj.findByGitlabId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByBitbucketId_decorators, { kind: "method", name: "findByBitbucketId", static: false, private: false, access: { has: function (obj) { return "findByBitbucketId" in obj; }, get: function (obj) { return obj.findByBitbucketId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByDiscordId_decorators, { kind: "method", name: "findByDiscordId", static: false, private: false, access: { has: function (obj) { return "findByDiscordId" in obj; }, get: function (obj) { return obj.findByDiscordId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByTwitchId_decorators, { kind: "method", name: "findByTwitchId", static: false, private: false, access: { has: function (obj) { return "findByTwitchId" in obj; }, get: function (obj) { return obj.findByTwitchId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findBySteamId_decorators, { kind: "method", name: "findBySteamId", static: false, private: false, access: { has: function (obj) { return "findBySteamId" in obj; }, get: function (obj) { return obj.findBySteamId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByRedditId_decorators, { kind: "method", name: "findByRedditId", static: false, private: false, access: { has: function (obj) { return "findByRedditId" in obj; }, get: function (obj) { return obj.findByRedditId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findBySpotifyId_decorators, { kind: "method", name: "findBySpotifyId", static: false, private: false, access: { has: function (obj) { return "findBySpotifyId" in obj; }, get: function (obj) { return obj.findBySpotifyId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByAmazonId_decorators, { kind: "method", name: "findByAmazonId", static: false, private: false, access: { has: function (obj) { return "findByAmazonId" in obj; }, get: function (obj) { return obj.findByAmazonId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByMicrosoftId_decorators, { kind: "method", name: "findByMicrosoftId", static: false, private: false, access: { has: function (obj) { return "findByMicrosoftId" in obj; }, get: function (obj) { return obj.findByMicrosoftId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByPatreonId_decorators, { kind: "method", name: "findByPatreonId", static: false, private: false, access: { has: function (obj) { return "findByPatreonId" in obj; }, get: function (obj) { return obj.findByPatreonId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByDropboxId_decorators, { kind: "method", name: "findByDropboxId", static: false, private: false, access: { has: function (obj) { return "findByDropboxId" in obj; }, get: function (obj) { return obj.findByDropboxId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByCoinbaseId_decorators, { kind: "method", name: "findByCoinbaseId", static: false, private: false, access: { has: function (obj) { return "findByCoinbaseId" in obj; }, get: function (obj) { return obj.findByCoinbaseId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByMetamaskId_decorators, { kind: "method", name: "findByMetamaskId", static: false, private: false, access: { has: function (obj) { return "findByMetamaskId" in obj; }, get: function (obj) { return obj.findByMetamaskId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByActiveDirectoryId_decorators, { kind: "method", name: "findByActiveDirectoryId", static: false, private: false, access: { has: function (obj) { return "findByActiveDirectoryId" in obj; }, get: function (obj) { return obj.findByActiveDirectoryId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByAppleId_decorators, { kind: "method", name: "findByAppleId", static: false, private: false, access: { has: function (obj) { return "findByAppleId" in obj; }, get: function (obj) { return obj.findByAppleId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByEmailVerificationToken_decorators, { kind: "method", name: "findByEmailVerificationToken", static: false, private: false, access: { has: function (obj) { return "findByEmailVerificationToken" in obj; }, get: function (obj) { return obj.findByEmailVerificationToken; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByPasswordToken_decorators, { kind: "method", name: "findByPasswordToken", static: false, private: false, access: { has: function (obj) { return "findByPasswordToken" in obj; }, get: function (obj) { return obj.findByPasswordToken; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersService = _classThis;
}();
exports.UsersService = UsersService;
