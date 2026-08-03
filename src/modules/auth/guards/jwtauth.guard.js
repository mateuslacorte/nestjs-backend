"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.JwtAuthGuard = void 0;
var common_1 = require("@nestjs/common");
var passport_1 = require("@nestjs/passport");
var graphql_1 = require("@nestjs/graphql");
var public_decorator_1 = require("../decorators/public.decorator");
var JwtAuthGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = (0, passport_1.AuthGuard)('jwt');
    var JwtAuthGuard = _classThis = /** @class */ (function (_super) {
        __extends(JwtAuthGuard_1, _super);
        function JwtAuthGuard_1(reflector) {
            var _this = _super.call(this) || this;
            _this.reflector = reflector;
            return _this;
        }
        JwtAuthGuard_1.prototype.canActivate = function (context) {
            var _a, _b;
            var isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            if (isPublic) {
                return true;
            }
            // Handshake already validated JWT and attached user on the socket
            if (context.getType() === 'ws') {
                var client = context.switchToWs().getClient();
                var user = (_b = (_a = client.data) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : client.user;
                return !!(user === null || user === void 0 ? void 0 : user.id);
            }
            return _super.prototype.canActivate.call(this, context);
        };
        JwtAuthGuard_1.prototype.getRequest = function (context) {
            var _a, _b, _c, _d;
            var type = context.getType();
            if (type === 'graphql') {
                return graphql_1.GqlExecutionContext.create(context).getContext().req;
            }
            if (type === 'ws') {
                var client = context.switchToWs().getClient();
                var user = (_b = (_a = client.data) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : client.user;
                var rawAuth = (_c = client.handshake.headers) === null || _c === void 0 ? void 0 : _c.authorization;
                var token = ((_d = client.handshake.auth) === null || _d === void 0 ? void 0 : _d.token) ||
                    (typeof rawAuth === 'string'
                        ? rawAuth.replace(/^Bearer\s+/i, '')
                        : undefined);
                return {
                    headers: {
                        authorization: token ? "Bearer ".concat(token) : undefined,
                    },
                    user: user,
                };
            }
            return context.switchToHttp().getRequest();
        };
        return JwtAuthGuard_1;
    }(_classSuper));
    __setFunctionName(_classThis, "JwtAuthGuard");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        JwtAuthGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return JwtAuthGuard = _classThis;
}();
exports.JwtAuthGuard = JwtAuthGuard;
